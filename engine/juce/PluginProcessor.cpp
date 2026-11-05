#include "PluginProcessor.h"

#include <BinaryData.h>

#include <algorithm>
#include <iostream>

#include "PluginEditor.h"
#include "Wire.h"

namespace citizen {

namespace {
constexpr int kPadBuses = 16;

// CITIZEN_UI_URL points the WebView at a dev server. Otherwise release
// builds serve the UI bundled into the binary, and dev builds without one
// load the dev server on its default port.
std::optional<juce::URL> uiUrlFromEnv() {
    const auto fromEnv = juce::SystemStats::getEnvironmentVariable("CITIZEN_UI_URL", {});
    if (fromEnv.isNotEmpty()) return juce::URL(fromEnv);
#if CITIZEN_BUNDLED_UI
    return std::nullopt;
#else
    return juce::URL("http://localhost:3000");
#endif
}

// Sample urls are absolute, but a relative one resolves against the site
juce::URL sampleBaseUrl(const std::optional<juce::URL>& uiUrl) {
    return uiUrl ? *uiUrl : juce::URL("https://www.citizensampler.com");
}

std::shared_ptr<const SampleBuffer> decodeBinary(const void* data, int size) {
    juce::String error;
    return SampleLoader::decode(data, static_cast<size_t>(size), error);
}
} // namespace

CitizenProcessor::CitizenProcessor()
    : juce::AudioProcessor(padBuses()),
      uiUrl_(uiUrlFromEnv()),
      loader_(sampleBaseUrl(uiUrl_)) {
    engine_.setMetronomeBuffers(decodeBinary(BinaryData::hiblock_wav, BinaryData::hiblock_wavSize),
                                decodeBinary(BinaryData::loblock_wav, BinaryData::loblock_wavSize));
    startTimerHz(4);
}

CitizenProcessor::~CitizenProcessor() = default;

// "Pad 1" carries the kit mix; hosts enable "Pad 2".."Pad 16" for multi-out
juce::AudioProcessor::BusesProperties CitizenProcessor::padBuses() {
    BusesProperties buses;
    for (int i = 1; i <= kPadBuses; ++i)
        buses = buses.withOutput("Pad " + juce::String(i), juce::AudioChannelSet::stereo(), i == 1);
    return buses;
}

// Kit: a mono or stereo main bus with the rest off. Multi-out: all 16 stereo.
bool CitizenProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    const auto& buses = layouts.outputBuses;
    if (buses.size() != kPadBuses) return false;
    const bool allStereo = std::all_of(buses.begin(), buses.end(),
                                       [](const auto& bus) { return bus == juce::AudioChannelSet::stereo(); });
    if (allStereo) return true;
    const bool othersOff =
        std::all_of(buses.begin() + 1, buses.end(), [](const auto& bus) { return bus.isDisabled(); });
    const auto main = buses.getReference(0);
    return othersOff && (main == juce::AudioChannelSet::stereo() || main == juce::AudioChannelSet::mono());
}

PadLayout CitizenProcessor::layoutFromBuses() const {
    for (int i = 0; i < getBusCount(false); ++i) {
        if (!getBus(false, i)->isEnabled()) return PadLayout::Kit;
    }
    return getBusCount(false) == kPadBuses ? PadLayout::MultiOut : PadLayout::Kit;
}

void CitizenProcessor::applyBusLayout() { engine_.setPadLayout(layoutFromBuses()); }

// Hosts may change buses off the audio thread, so this waits for the lock
void CitizenProcessor::processorLayoutsChanged() {
    std::lock_guard lock(engineLock_);
    applyBusLayout();
}

void CitizenProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    std::lock_guard lock(engineLock_);
    engine_.prepare(sampleRate, juce::jmax(samplesPerBlock, 32));
    applyBusLayout();
}

void CitizenProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
    juce::ScopedNoDenormals noDenormals;
    std::unique_lock lock(engineLock_, std::try_to_lock);
    if (!lock.owns_lock()) {
        buffer.clear();
        return;
    }

    HostState host;
    host.isPlugin = wrapperType != wrapperType_Standalone;
    if (auto* playHead = getPlayHead()) {
        if (const auto position = playHead->getPosition()) {
            if (const auto bpm = position->getBpm()) host.tempo = *bpm;
            host.playing = position->getIsPlaying();
        }
    }
    engine_.setHost(host);

    for (const auto metadata : midi) {
        const auto message = metadata.getMessage();
        // A note-on with velocity 0 counts as a note-off
        if (message.isNoteOn()) {
            engine_.midiNoteOn(message.getChannel(), message.getNoteNumber(), message.getFloatVelocity());
        } else if (message.isNoteOff()) {
            engine_.midiNoteOff(message.getChannel(), message.getNoteNumber());
        }
    }

    // In multi-out the buffer holds every bus, a stereo pair per pad
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
    const std::lock_guard lock(stateLock_);
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
        previewUrl = engine_.takePreviewRequest();
    }

    for (const auto& [padId, url] : needed) {
        if (!loading_.insert({padId, url}).second) continue;
        loader_.load(juce::String(url), [this, padId, url](auto buffer, juce::String error) {
            loading_.erase({padId, url});
            // Copy the reversed audio before locking, so the audio thread
            // only waits for pointer swaps
            auto reversed = buffer ? reversedCopy(*buffer) : nullptr;
            {
                std::lock_guard lock(engineLock_);
                if (buffer) engine_.setPadBuffer(padId, url, buffer, std::move(reversed));
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
    // Hosts may save from any thread
    const std::lock_guard lock(stateLock_);
    const auto json = wire::sessionStateJson(*savedPads_, savedLoops_);
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

juce::AudioProcessorEditor* CitizenProcessor::createEditor() {
    // The new page needs the host context; it also asks with requestHostContext
    {
        std::lock_guard lock(engineLock_);
        engine_.emitHostContext();
    }
    return new CitizenEditor(*this);
}

} // namespace citizen

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new citizen::CitizenProcessor(); }
