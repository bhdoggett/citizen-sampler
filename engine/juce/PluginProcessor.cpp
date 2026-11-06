#include "PluginProcessor.h"

#include <BinaryData.h>

#include <algorithm>
#include <iostream>

#include "PluginEditor.h"
#include "StemFiles.h"
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

juce::File stemsRoot() {
    return juce::File::getSpecialLocation(juce::File::userMusicDirectory)
        .getChildFile("Citizen Sampler")
        .getChildFile("Stems");
}

// Replaces the file; false unless it ends up holding the whole stem
bool writeWav(const juce::File& file, const SampleBuffer& stem) {
    const int channels = static_cast<int>(stem.channels.size());
    if (channels == 0) return false;
    // createOutputStream appends to an existing file
    if (!file.deleteFile()) return false;
    bool written = false;
    {
        std::unique_ptr<juce::OutputStream> stream = file.createOutputStream();
        if (!stream) return false;
        const auto options = juce::AudioFormatWriterOptions{}
                                 .withSampleRate(stem.sampleRate)
                                 .withNumChannels(channels)
                                 .withBitsPerSample(24);
        auto writer = juce::WavAudioFormat().createWriterFor(stream, options);
        if (!writer) return false;
        std::vector<const float*> data;
        for (const auto& channel : stem.channels) data.push_back(channel.data());
        written = writer->writeFromFloatArrays(data.data(), channels, stem.numFrames()) && writer->flush();
        // The writer finishes the header as it goes away
    }
    return written && file.getSize() > 0;
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

CitizenProcessor::~CitizenProcessor() {
    // An export in progress stops after its current stem
    if (stemPool_) stemPool_->removeAllJobs(true, 10000);
}

// "Pad 1" carries the kit mix; in multi-out "Pad N" carries pad N
juce::AudioProcessor::BusesProperties CitizenProcessor::padBuses() {
    BusesProperties buses;
    for (int i = 1; i <= kPadBuses; ++i)
        buses = buses.withOutput("Pad " + juce::String(i), juce::AudioChannelSet::stereo(), i == 1);
    return buses;
}

// A mono or stereo main bus with the rest off, or all 16 stereo. This only
// limits what hosts may enable; the layout setting decides the routing.
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

void CitizenProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    std::lock_guard lock(engineLock_);
    engine_.setIsPlugin(isPlugin());
    engine_.prepare(sampleRate, juce::jmax(samplesPerBlock, 32));
}

void CitizenProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
    juce::ScopedNoDenormals noDenormals;
    std::unique_lock lock(engineLock_, std::try_to_lock);
    if (!lock.owns_lock()) {
        buffer.clear();
        return;
    }

    HostState host;
    host.isPlugin = isPlugin();
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

    // The buffer holds every enabled bus. In multi-out with all 16 enabled
    // each pad gets its own pair; with fewer, the engine renders the mix.
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
    else if (type == "setPadLayout") savedLayout_ = wire::parseLayout(json["layout"].toString()).value_or(PadLayout::Kit);
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

void CitizenProcessor::saveStems(const juce::String& songTitle, std::function<void(juce::var)> done) {
    struct Export {
        stems::Target target;
        StemJob job;
    };
    std::vector<Export> exports;
    double sampleRate;
    {
        std::lock_guard lock(engineLock_);
        for (auto& target : stems::targets()) {
            if (auto job = engine_.stemJob(target.padId, target.loop)) exports.push_back({target, std::move(*job)});
        }
        sampleRate = engine_.sampleRate();
    }
    if (exports.empty()) {
        auto* result = new juce::DynamicObject();
        result->setProperty("saved", 0);
        done(juce::var(result));
        return;
    }
    const auto folder = stems::exportFolder(stemsRoot(), songTitle, juce::Time::getCurrentTime());
    if (!stemPool_) {
        stemPool_ = std::make_unique<juce::ThreadPool>(
            juce::ThreadPool::Options{}.withThreadName("Citizen stems").withNumberOfThreads(1));
    }
    // The jobs own copies of everything they need, so rendering never
    // touches the engine
    stemPool_->addJob([jobs = std::move(exports), sampleRate, folder, finish = std::move(done)]() mutable {
        const auto out = folder.exists() ? folder.getNonexistentSibling() : folder;
        int saved = 0;
        int failed = 0;
        if (out.createDirectory()) {
            for (const auto& e : jobs) {
                // The processor is going away
                if (auto* job = juce::ThreadPoolJob::getCurrentThreadPoolJob(); job != nullptr && job->shouldExit())
                    return;
                const auto file = out.getChildFile(stems::fileName(e.target.padId, e.target.loop));
                if (writeWav(file, citizen::renderStem(e.job, sampleRate)))
                    ++saved;
                else
                    ++failed;
            }
        } else {
            failed = static_cast<int>(jobs.size());
        }
        juce::MessageManager::callAsync([saved, failed, out, reply = std::move(finish)] {
            auto* result = new juce::DynamicObject();
            result->setProperty("saved", saved);
            if (failed > 0) result->setProperty("failed", failed);
            result->setProperty("folder", out.getFullPathName());
            if (saved > 0) out.revealToUser();
            reply(juce::var(result));
        });
    });
}

// ---- Session state ----

void CitizenProcessor::getStateInformation(juce::MemoryBlock& destData) {
    // Hosts may save from any thread
    const std::lock_guard lock(stateLock_);
    const auto json = wire::sessionStateJson(*savedPads_, savedLoops_, savedLayout_);
    destData.replaceAll(json.toRawUTF8(), json.getNumBytesAsUTF8());
}

void CitizenProcessor::setStateInformation(const void* data, int sizeInBytes) {
    const auto json = juce::JSON::parse(juce::String::fromUTF8(static_cast<const char*>(data), sizeInBytes));
    if (!json.isObject()) return;
    // Replay the saved commands, so pads play from MIDI before the UI opens.
    // Sessions saved before the layout setting load as kit.
    auto* layout = new juce::DynamicObject();
    layout->setProperty("type", "setPadLayout");
    layout->setProperty("layout", wire::layoutName(wire::sessionLayout(json)));
    handleCommand(juce::var(layout));
    if (json["loops"].isObject()) handleCommand(json["loops"]);
    if (auto* pads = json["pads"].getDynamicObject()) {
        for (const auto& property : pads->getProperties()) handleCommand(property.value);
    }
}

juce::AudioProcessorEditor* CitizenProcessor::createEditor() {
    // The new page needs the host context; it also asks with requestHostContext.
    // The host may not have processed audio yet, so say whether this is a
    // plugin before the context goes out.
    {
        std::lock_guard lock(engineLock_);
        engine_.setIsPlugin(isPlugin());
        engine_.emitHostContext();
    }
    return new CitizenEditor(*this);
}

} // namespace citizen

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new citizen::CitizenProcessor(); }
