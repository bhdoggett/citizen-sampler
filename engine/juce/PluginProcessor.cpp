#include "PluginProcessor.h"

#include <BinaryData.h>

#include <iostream>

#include "PluginEditor.h"
#include "Wire.h"

namespace citizen {

namespace {
constexpr int kFirstPadNote = 36; // C1 plays pad 1

juce::URL defaultUiUrl() {
    const auto fromEnv = juce::SystemStats::getEnvironmentVariable("CITIZEN_UI_URL", {});
    return juce::URL(fromEnv.isNotEmpty() ? fromEnv : "http://localhost:3000");
}

std::shared_ptr<const SampleBuffer> decodeBinary(const void* data, int size) {
    juce::String error;
    return SampleLoader::decode(data, static_cast<size_t>(size), error);
}
} // namespace

CitizenProcessor::CitizenProcessor()
    : juce::AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      uiUrl_(defaultUiUrl()),
      loader_(uiUrl_) {
    engine_.setMetronomeBuffers(decodeBinary(BinaryData::hiblock_wav, BinaryData::hiblock_wavSize),
                                decodeBinary(BinaryData::loblock_wav, BinaryData::loblock_wavSize));
    startTimerHz(4);
}

CitizenProcessor::~CitizenProcessor() = default;

bool CitizenProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    const auto out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::stereo() || out == juce::AudioChannelSet::mono();
}

void CitizenProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    std::lock_guard lock(engineLock_);
    engine_.prepare(sampleRate, juce::jmax(samplesPerBlock, 32));
}

void CitizenProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
    juce::ScopedNoDenormals noDenormals;
    std::unique_lock lock(engineLock_, std::try_to_lock);
    if (!lock.owns_lock()) {
        buffer.clear();
        return;
    }

    for (const auto metadata : midi) {
        const auto message = metadata.getMessage();
        const int pad = message.getNoteNumber() - kFirstPadNote + 1;
        if (pad < 1 || pad > 16) continue;
        const std::string padId = "pad-" + std::to_string(pad);
        if (message.isNoteOn()) {
            engine_.handle(cmd::Press{padId, "C4", message.getFloatVelocity()});
        } else if (message.isNoteOff()) {
            engine_.handle(cmd::Release{padId, "C4"});
        }
    }

    engine_.process(buffer.getArrayOfWritePointers(), buffer.getNumChannels(), buffer.getNumSamples());
}

// ---- UI commands ----

void CitizenProcessor::handleCommand(const juce::var& json) {
    if (logBridge_) std::cerr << "command " << json["type"].toString() << " " << json["padId"].toString() << "\n";
    const auto command = wire::parseCommand(json);
    if (!command) {
        DBG("Unknown engine command: " << juce::JSON::toString(json, true));
        return;
    }
    rememberSongCommand(json);
    apply(*command);
}

void CitizenProcessor::apply(const Command& command) {
    {
        std::lock_guard lock(engineLock_);
        engine_.handle(command);
    }
    loadMissingAudio();
}

void CitizenProcessor::rememberSongCommand(const juce::var& json) {
    const auto type = json["type"].toString();
    if (type == "setPad") savedPads_->setProperty(json["padId"].toString(), json);
    else if (type == "removePad") savedPads_->removeProperty(json["padId"].toString());
    else if (type == "setLoops") savedLoops_ = json;
}

void CitizenProcessor::pushHostEvent(juce::var event) { hostEvents_.add(std::move(event)); }

void CitizenProcessor::loadMissingAudio() {
    std::vector<std::pair<std::string, std::string>> needed;
    std::optional<std::string> previewUrl;
    {
        std::lock_guard lock(engineLock_);
        needed = engine_.padsNeedingAudio();
        previewUrl = engine_.previewUrl();
    }

    for (const auto& [padId, url] : needed) {
        if (!loading_.insert({padId, url}).second) continue;
        loader_.load(juce::String(url), [this, padId, url](auto buffer, juce::String error) {
            loading_.erase({padId, url});
            {
                std::lock_guard lock(engineLock_);
                if (buffer) engine_.setPadBuffer(padId, url, buffer);
                else engine_.setPadLoadFailed(padId, url, error.toStdString());
            }
            pushHostEvent(wire::toJson(evt::Loading{static_cast<int>(loading_.size())}));
        });
    }
    if (!needed.empty()) pushHostEvent(wire::toJson(evt::Loading{static_cast<int>(loading_.size())}));

    if (previewUrl) {
        const std::string url = *previewUrl;
        loader_.load(juce::String(url), [this, url](auto buffer, juce::String) {
            std::lock_guard lock(engineLock_);
            engine_.setPreviewBuffer(url, buffer);
        });
    }
}

void CitizenProcessor::timerCallback() {
    if (getActiveEditor() != nullptr) return;
    hostEvents_.clear();
    std::lock_guard lock(engineLock_);
    engine_.takeEvents();
}

juce::Array<juce::var> CitizenProcessor::takeEvents() {
    juce::Array<juce::var> out;
    out.swapWith(hostEvents_);
    std::vector<Event> events;
    {
        std::lock_guard lock(engineLock_);
        events = engine_.takeEvents();
    }
    for (const auto& e : events) out.add(wire::toJson(e));
    if (logBridge_) {
        for (const auto& e : out) std::cerr << "event " << juce::JSON::toString(e, true) << "\n";
    }
    return out;
}

juce::var CitizenProcessor::renderStem(const juce::String& padId, const juce::String& loopName) {
    const auto loop = wire::parseLoop(loopName);
    if (!loop) return {};
    std::optional<StemJob> job;
    double sampleRate;
    {
        std::lock_guard lock(engineLock_);
        job = engine_.stemJob(padId.toStdString(), *loop);
        sampleRate = engine_.sampleRate();
    }
    // Rendered outside the lock, so playback carries on
    if (!job) return {};
    return wire::toJson(citizen::renderStem(*job, sampleRate));
}

// ---- Session state ----

void CitizenProcessor::getStateInformation(juce::MemoryBlock& destData) {
    auto* state = new juce::DynamicObject();
    state->setProperty("pads", juce::var(savedPads_.get()));
    state->setProperty("loops", savedLoops_);
    const auto json = juce::JSON::toString(juce::var(state), true);
    destData.replaceAll(json.toRawUTF8(), json.getNumBytesAsUTF8());
}

void CitizenProcessor::setStateInformation(const void* data, int sizeInBytes) {
    const auto json = juce::JSON::parse(juce::String::fromUTF8(static_cast<const char*>(data), sizeInBytes));
    if (!json.isObject()) return;
    // Replay the saved commands, so pads play from MIDI before the UI opens
    if (json["loops"].isObject()) handleCommand(json["loops"]);
    if (auto* pads = json["pads"].getDynamicObject()) {
        for (const auto& property : pads->getProperties()) handleCommand(property.value);
    }
}

juce::AudioProcessorEditor* CitizenProcessor::createEditor() { return new CitizenEditor(*this); }

} // namespace citizen

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new citizen::CitizenProcessor(); }
