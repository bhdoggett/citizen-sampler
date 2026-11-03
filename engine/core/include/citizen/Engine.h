#pragma once

#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
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
    void setPadBuffer(const std::string& padId, const std::string& url,
                      std::shared_ptr<const SampleBuffer> buffer);
    void setPadLoadFailed(const std::string& padId, const std::string& url,
                          const std::string& message);
    void setMetronomeBuffers(std::shared_ptr<const SampleBuffer> high,
                             std::shared_ptr<const SampleBuffer> low);
    void setPreviewBuffer(const std::string& url, std::shared_ptr<const SampleBuffer> buffer);

    // Pads, as (padId, url), whose sample the host still has to load
    std::vector<std::pair<std::string, std::string>> padsNeedingAudio() const;
    // The sample the UI asked to preview and the host should load, if any
    const std::optional<std::string>& previewUrl() const { return previewUrl_; }

    // Writes, not adds, `numChannels` channels of `numFrames`
    void process(float* const* out, int numChannels, int numFrames);

    // Events since the last call, oldest first
    std::vector<Event> takeEvents();

    // The stem job for one pad's hits in one loop, or nothing when the
    // loop has no settings, the pad has no sample or no hits there
    std::optional<StemJob> stemJob(const std::string& padId, Loop loop) const;
    std::optional<SampleBuffer> renderStem(const std::string& padId, Loop loop,
                                           double sampleRate) const;

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

    std::unique_ptr<LiveInput> live_;
    std::vector<Timer> timers_;
    int nextTimer_ = 1;
    std::vector<Due> due_;
    std::vector<Event> events_;

    std::shared_ptr<const SampleBuffer> clickHigh_, clickLow_;
    std::vector<Voice> clicks_;

    std::optional<std::string> previewUrl_;
    std::shared_ptr<const SampleBuffer> previewBuffer_;
    Voice preview_;

    std::vector<float> mixL_, mixR_;
};

} // namespace citizen
