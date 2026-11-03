#include "citizen/Rules.h"

#include <algorithm>
#include <cmath>
#include <limits>
#include <string>

namespace citizen {

double ticksToSeconds(double ticks, double bpm) { return (ticks / kPPQ) * (60.0 / bpm); }

double secondsToTicks(double seconds, double bpm) { return seconds * (bpm / 60.0) * kPPQ; }

double loopDurationSeconds(const LoopTiming& timing) {
    return timing.bars * timing.beats * (60.0 / timing.bpm);
}

double wrapTicks(double ticks, const LoopTiming& timing) {
    return std::fmod(ticks, timing.bars * timing.beats * kPPQ);
}

double elapsedInLoop(double fromSeconds, double toSeconds, const LoopTiming& timing) {
    const double elapsed = toSeconds - fromSeconds;
    return elapsed >= 0 ? elapsed : elapsed + loopDurationSeconds(timing);
}

double quantize(double seconds, std::string_view quantVal, double bpm) {
    const double secondsPerQuarter = 60.0 / bpm;
    const bool triplet = quantVal.find('t') != std::string_view::npos;
    // Leading digits, as parseInt reads them
    const double division = std::atof(std::string(quantVal).c_str());
    if (division <= 0) return seconds;
    const double grid = secondsPerQuarter / (triplet ? division * 1.5 : division) * 4.0;
    return std::round(seconds / grid) * grid;
}

ReleaseDecision resolveRelease(bool held, bool oneShot, bool audioReleased) {
    if (!held) return {false, false};
    return {!oneShot && !audioReleased, true};
}

float computeGain(bool mute, bool solo, bool solosExist) {
    if (mute) return 0.0f;
    if (solosExist && !solo) return 0.0f;
    return 1.0f;
}

TriggerParams calcTriggerParams(const SampleSettings& settings, double playbackRate,
                                double eventDuration, double bufferDuration) {
    const bool hasEnd = settings.end.has_value() && *settings.end != 0.0;
    const std::optional<double> sampleDuration =
        hasEnd ? std::optional<double>((*settings.end - settings.start) / playbackRate)
               : std::nullopt;

    // With no end point, a one-shot pad plays out the rest of its buffer
    const double duration =
        settings.oneShot
            ? sampleDuration.value_or((bufferDuration - settings.start) / playbackRate)
            : std::min(sampleDuration.value_or(std::numeric_limits<double>::infinity()),
                       eventDuration);
    const double offset =
        settings.reverse ? bufferDuration - settings.end.value_or(bufferDuration) : settings.start;
    return {duration, offset};
}

double calcReleaseDelay(double start, std::optional<double> end, double bufferDuration,
                        double playbackRate) {
    return (end.value_or(bufferDuration) - start) / playbackRate;
}

double swingOffsetSeconds(double ticks, double swing, double bpm) {
    // Tone swings eighth notes: the swing window is one beat
    const double window = kPPQ;
    const double t = std::round(ticks);
    if (swing <= 0 || std::fmod(t, window) == 0.0) return 0.0;
    const double progress = std::fmod(t, window) / window;
    const double amount = std::sin(progress * M_PI) * swing;
    return ticksToSeconds(window / 3.0, bpm) * amount;
}

} // namespace citizen
