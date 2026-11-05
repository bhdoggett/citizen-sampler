#pragma once

#include <array>
#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "citizen/LiveInput.h"
#include "citizen/PadChannel.h"
#include "citizen/Protocol.h"
#include "citizen/Schedule.h"
#include "citizen/Types.h"
#include "citizen/Voice.h"

namespace citizen {

// Everything needed to render one pad's stem, copied out of the engine so a
// host can render without holding up the audio thread
struct StemJob {
    PadState pad;
    std::shared_ptr<const SampleBuffer> buffer;
    LoopSettings loop;
    Loop loopName = Loop::A;
    bool silenced = false; // muted, or another pad is soloed
};

// Render a stem offline as a stereo buffer
SampleBuffer renderStem(const StemJob& job, double sampleRate);

// What the plugin host reports, sent to the engine every audio block
struct HostState {
    bool isPlugin = false;
    std::optional<double> tempo; // beats per minute; replaces every loop's bpm in a plugin
    bool playing = false;        // the host's transport
};

// The sound engine behind the UI boundary: it follows the pads and loops it
// is sent, plays and records, and reports back through events. Mirrors the
// web's ToneEngine.
//
// Threading: the core is single-threaded. The host must not call handle()
// and process() at the same time; the JUCE layer serializes them.
class Engine {
public:
    Engine();
    ~Engine();
    // Live input calls back into this object, so it never moves
    Engine(const Engine&) = delete;
    Engine& operator=(const Engine&) = delete;

    void prepare(double sampleRate, int maxBlockFrames);
    void handle(const Command& command);

    // Decoded audio from the host. Ignored unless `url` is still the pad's url.
    // Pass the reversed copy (see reversedCopy) to keep that work out of any
    // lock the host holds around this call.
    void setPadBuffer(const std::string& padId, const std::string& url,
                      std::shared_ptr<const SampleBuffer> buffer,
                      std::shared_ptr<const SampleBuffer> reversed = nullptr);
    void setPadLoadFailed(const std::string& padId, const std::string& url,
                          const std::string& message);
    void setMetronomeBuffers(std::shared_ptr<const SampleBuffer> high,
                             std::shared_ptr<const SampleBuffer> low);
    void setPreviewBuffer(const std::string& url, std::shared_ptr<const SampleBuffer> buffer);

    // Pads, as (padId, url), whose sample the host still has to load
    std::vector<std::pair<std::string, std::string>> padsNeedingAudio() const;
    // The sample being previewed, if any
    const std::optional<std::string>& previewUrl() const { return previewUrl_; }
    // A preview the host has not been asked to load yet. Returned once.
    std::optional<std::string> takePreviewRequest() { return std::exchange(previewRequest_, std::nullopt); }

    // Writes, not adds, `numChannels` channels of `numFrames`
    void process(float* const* out, int numChannels, int numFrames);

    // Events since the last call, oldest first
    std::vector<Event> takeEvents();

    // The stem job for one pad's hits in one loop, or nothing when the
    // loop has no settings, the pad has no sample or no hits there
    std::optional<StemJob> stemJob(const std::string& padId, Loop loop) const;
    std::optional<SampleBuffer> renderStem(const std::string& padId, Loop loop,
                                           double sampleRate) const;

    void setPadLayout(PadLayout layout);
    PadLayout padLayout() const { return layout_; }
    // Called every block: acts and emits only when something changed
    void setHost(const HostState& host);
    // Queues the current host context, e.g. when an editor opens
    void emitHostContext();
    // MIDI from the host. `channel` is 1 to 16, `velocity` 0 to 1.
    void midiNoteOn(int channel, int note, double velocity);
    void midiNoteOff(int channel, int note);

    double sampleRate() const { return sampleRate_; }
    bool playing() const { return playing_; }
    double position() const { return position_; }

private:
    struct Pad {
        PadState state;
        PadChannel channel;
        std::vector<ScheduledHit> schedule; // for the current loop
        std::shared_ptr<const SampleBuffer> buffer;
        std::string bufferUrl;              // url `buffer` came from
        std::string failedUrl;              // url that failed to load, not retried
    };
    struct Timer {
        double at;
        int id;
        std::function<void()> fn;
    };
    struct Due {
        long long frame;
        Event event;
    };

    void press(const std::string& padId, const std::string& note, double velocity);
    void release(const std::string& padId, const std::string& note);
    void setPad(const std::string& padId, const PadState& state);
    void setLoops(const AllLoopSettings& loops);
    void setCurrentLoop(Loop loop);
    void play();
    void stop();
    void emitTransport();
    void emitAt(long long frame, Event event);
    void rebuildSchedules();
    void applyGains();
    std::optional<LoopTiming> timing(Loop loop) const;
    std::optional<double> hostTempo() const;
    double swing() const;
    double nowSeconds() const { return static_cast<double>(frameClock_) / sampleRate_; }
    std::optional<double> attack(const std::string& padId, const std::string& note, double velocity);
    void triggerScheduled(Pad& pad, const std::string& padId, const ScheduledHit& hit,
                          int delayFrames);
    void runSegment(double from, double to, int blockOffset);
    void fireTimers();

    double sampleRate_ = 44100.0;
    int maxBlockFrames_ = 1024;
    std::map<std::string, std::unique_ptr<Pad>> pads_;
    AllLoopSettings loops_{};
    Loop currentLoop_ = Loop::A;
    bool playing_ = false;
    bool recording_ = false;
    bool metronomeOn_ = false;
    double position_ = 0.0;      // seconds into the current loop
    long long frameClock_ = 0;   // frames processed since prepare

    // The pad and trigger note each held MIDI note started, by channel and
    // note, so its note-off releases the same voice
    using HeldMidi = std::optional<std::pair<std::string, std::string>>;
    std::array<HeldMidi, kPadCount * 128> heldMidi_;
    PadLayout layout_ = PadLayout::Kit;
    HostState host_;
    // Set while a press that must not be recorded is going through live_
    bool suppressRecording_ = false;

    std::unique_ptr<LiveInput> live_;
    std::vector<Timer> timers_;
    int nextTimer_ = 1;
    std::vector<Due> due_;
    // Reserved in prepare() and after every takeEvents()
    static constexpr size_t kEventCapacity = 256;
    std::vector<Event> events_;
    // A host tempo change while stopped; rebuilt on the message thread
    bool schedulesStale_ = false;

    std::shared_ptr<const SampleBuffer> clickHigh_, clickLow_;
    std::vector<Voice> clicks_;

    std::optional<std::string> previewUrl_;
    std::optional<std::string> previewRequest_;
    std::shared_ptr<const SampleBuffer> previewBuffer_;
    Voice preview_;

    std::vector<float> mixL_, mixR_;
};

} // namespace citizen
