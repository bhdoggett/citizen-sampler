#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

#include <functional>
#include <mutex>
#include <optional>
#include <set>

#include "SampleLoader.h"
#include "citizen/Engine.h"

namespace citizen {

// Hosts the C++ engine. The WebView UI drives it with the same commands the
// web engine takes; MIDI goes to the engine, which maps it per pad layout.
// It declares 16 stereo output buses. In the kit layout bus 1 carries the
// mix; in multi-out, a plugin setting saved with the session, pad N plays
// on bus N. Hosts may enable any number of buses (JUCE's AU wrapper enables
// them all), so the layout never comes from the buses.
//
// Threading: the engine core is single-threaded, so one mutex guards it.
// The message thread locks it to apply commands; the audio thread only
// tries the lock and outputs silence for a block if it is busy.
class CitizenProcessor : public juce::AudioProcessor, private juce::Timer {
public:
    CitizenProcessor();
    ~CitizenProcessor() override;

    // ---- Called from the UI, on the message thread ----
    void handleCommand(const juce::var& json);
    // Events since the last call, as JSON for the WebView
    juce::Array<juce::var> takeEvents();
    // { sampleRate, channels } or void when there is nothing to render
    juce::var renderStem(const juce::String& padId, const juce::String& loop);
    // Writes every stem with hits as a 24-bit WAV into a fresh folder,
    // ~/Music/Citizen Sampler/Stems/<song>/<date time>/pad-N-loop-X.wav,
    // and shows it in the Finder. Renders on a background thread from jobs
    // copied out under the engine lock; done runs on the message thread
    // with { saved, failed?, folder }, or { saved: 0 } when there is nothing
    // to export. Never calls done if the processor goes away mid-export.
    void saveStems(const juce::String& songTitle, std::function<void(juce::var)> done);
    // Where the WebView loads the UI from, or nothing to serve the bundled one
    std::optional<juce::URL> uiUrl() const { return uiUrl_; }

    // ---- juce::AudioProcessor ----
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

private:
    static BusesProperties padBuses();
    bool isPlugin() const { return wrapperType != wrapperType_Standalone; }
    // With no editor open, nobody reads events, so drop them
    void timerCallback() override;
    void apply(const Command& command);
    void loadMissingAudio();
    void pushHostEvent(juce::var event);
    void rememberSongCommand(const juce::var& json);

    std::mutex engineLock_;
    Engine engine_;
    std::optional<juce::URL> uiUrl_;
    SampleLoader loader_;

    // Loads in flight, as padId + url, so a pad isn't fetched twice
    std::set<std::pair<std::string, std::string>> loading_;
    juce::Array<juce::var> hostEvents_;
    // Set CITIZEN_LOG_BRIDGE=1 to print bridge traffic to stderr
    const bool logBridge_ = juce::SystemStats::getEnvironmentVariable("CITIZEN_LOG_BRIDGE", {}).isNotEmpty();

    // The last setPad per pad, the last setLoops and the pad layout, saved
    // with the DAW session
    std::mutex stateLock_;
    juce::DynamicObject::Ptr savedPads_ = new juce::DynamicObject();
    juce::var savedLoops_;
    PadLayout savedLayout_ = PadLayout::Kit;

    // Stem exports, created on the first one. Its jobs never touch the
    // processor; declared last so it goes away first.
    std::unique_ptr<juce::ThreadPool> stemPool_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CitizenProcessor)
};

} // namespace citizen
