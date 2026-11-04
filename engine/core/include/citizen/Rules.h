#pragma once

#include <string_view>

#include "citizen/Types.h"

// Pure rules shared with the web engine. Each mirrors a TypeScript function
// of the same name in frontend-next/src/lib/audio, and the tests port its
// cases, so both engines behave alike.
namespace citizen {

inline constexpr double kPPQ = 192.0;

double ticksToSeconds(double ticks, double bpm);
double secondsToTicks(double seconds, double bpm);
double loopDurationSeconds(const LoopTiming& timing);
double wrapTicks(double ticks, const LoopTiming& timing);
double elapsedInLoop(double fromSeconds, double toSeconds, const LoopTiming& timing);

// Snap a time in seconds to a grid such as "8" (eighth notes) or "8t"
double quantize(double seconds, std::string_view quantVal, double bpm);

struct ReleaseDecision {
    bool releaseAudio;
    bool record;
};
ReleaseDecision resolveRelease(bool held, bool oneShot, bool audioReleased);

// 0 or 1: muted, or silent because another pad is soloed
float computeGain(bool mute, bool solo, bool solosExist);

struct TriggerParams {
    double duration;
    double offset;
};
TriggerParams calcTriggerParams(const SampleSettings& settings, double playbackRate,
                                double eventDuration, double bufferDuration);

// Seconds until a live hit ends on its own
double calcReleaseDelay(double start, std::optional<double> end, double bufferDuration,
                        double playbackRate = 1.0);

// Seconds Tone.js would delay an event at this tick for the given swing
double swingOffsetSeconds(double ticks, double swing, double bpm);

} // namespace citizen
