#pragma once

#include <functional>
#include <map>
#include <optional>
#include <string>

#include "citizen/Protocol.h"

namespace citizen {

// Press and release from keys, mouse, touch or MIDI. A hit is held here from
// press to release and committed once, on release, as a HitRecorded event.
// Mirrors frontend-next/src/lib/engine/liveInput.ts.
class LiveInput {
public:
    struct Position {
        Loop loop;
        double ticks;
    };

    // What live input needs from the engine around it
    struct Deps {
        // Start the sound. Returns seconds until it ends on its own, or
        // nothing when the pad has no sound loaded.
        std::function<std::optional<double>(const std::string& padId, const std::string& note,
                                            double velocity)> attack;
        std::function<void(const std::string& padId, const std::string& note)> releaseVoice;
        std::function<SampleSettings(const std::string& padId)> padSettings;
        // Where a hit pressed now lands, or nothing when not recording
        std::function<std::optional<Position>()> recordingPosition;
        std::function<bool()> isRecording;
        std::function<double()> transportSeconds;
        std::function<std::optional<LoopTiming>(Loop)> loopTiming;
        std::function<void(Event)> emit;
        // Run `fn` after `seconds`; returns a handle for cancelTimer
        std::function<int(double seconds, std::function<void()> fn)> setTimer;
        std::function<void(int handle)> cancelTimer;
    };

    explicit LiveInput(Deps deps) : deps_(std::move(deps)) {}

    void press(const std::string& padId, const std::string& note, double velocity);
    void release(const std::string& padId, const std::string& note);
    // Stop every live voice and forget pending hits
    void reset();

private:
    struct Pending {
        Loop loop;
        double startTicks;
        // Duration is measured on the seconds clock alone, since ticks and
        // seconds can round to slightly different moments
        double startSeconds;
        double velocity;
    };
    struct Held {
        std::string padId;
        std::string note;
        bool held = true;
        bool audioReleased = false;
        std::optional<int> timer;
        std::optional<Pending> pending;
    };

    void endVoice(Held& entry);

    Deps deps_;
    std::map<std::string, Held> notes_;
};

} // namespace citizen
