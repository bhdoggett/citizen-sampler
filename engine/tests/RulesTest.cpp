#include <doctest/doctest.h>

#include "citizen/Rules.h"

using namespace citizen;

namespace {
const LoopTiming kLive{120.0, 4, 2}; // 4 s loop of 1536 ticks

SampleSettings pad(double start = 0, std::optional<double> end = std::nullopt,
                   bool oneShot = false, bool reverse = false) {
    SampleSettings s;
    s.start = start;
    s.end = end;
    s.oneShot = oneShot;
    s.reverse = reverse;
    return s;
}
} // namespace

TEST_CASE("timing conversions") {
    CHECK(ticksToSeconds(192, 120) == doctest::Approx(0.5));
    CHECK(secondsToTicks(0.5, 120) == doctest::Approx(192));
    CHECK(loopDurationSeconds(kLive) == doctest::Approx(4));
    CHECK(loopDurationSeconds({60, 3, 1}) == doctest::Approx(3));
    CHECK(wrapTicks(1536 + 10, kLive) == doctest::Approx(10));
    CHECK(wrapTicks(100, kLive) == doctest::Approx(100));
}

TEST_CASE("elapsedInLoop") {
    CHECK(elapsedInLoop(1, 1.25, kLive) == doctest::Approx(0.25));
    // The transport wrapped between the two readings
    CHECK(elapsedInLoop(3.75, 0.25, kLive) == doctest::Approx(0.5));
}

TEST_CASE("quantize snaps to straight and triplet grids") {
    CHECK(quantize(0.24, "4", 120) == doctest::Approx(0));
    CHECK(quantize(0.26, "4", 120) == doctest::Approx(0.5));
    CHECK(quantize(1.1, "4", 120) == doctest::Approx(1.0));
    CHECK(quantize(0.3, "8", 120) == doctest::Approx(0.25));
    CHECK(quantize(0.13, "16", 120) == doctest::Approx(0.125));
    CHECK(quantize(1.4, "1", 120) == doctest::Approx(2));
    CHECK(quantize(0.6, "4", 60) == doctest::Approx(1));

    const std::pair<const char*, double> triplets[] = {
        {"1t", 4.0 / 3}, {"2t", 2.0 / 3}, {"4t", 1.0 / 3},
        {"8t", 1.0 / 6}, {"16t", 1.0 / 12}, {"32t", 1.0 / 24},
    };
    for (auto [quantVal, grid] : triplets) {
        CAPTURE(quantVal);
        CHECK(quantize(grid * 1.1, quantVal, 120) == doctest::Approx(grid));
        CHECK(quantize(grid * 2.9, quantVal, 120) == doctest::Approx(grid * 3));
    }
}

TEST_CASE("resolveRelease") {
    auto r = resolveRelease(false, false, false);
    CHECK_FALSE(r.record);
    CHECK_FALSE(r.releaseAudio);

    r = resolveRelease(true, false, false);
    CHECK(r.record);
    CHECK(r.releaseAudio);

    // Sound already stopped on its own: still record, nothing to release
    r = resolveRelease(true, false, true);
    CHECK(r.record);
    CHECK_FALSE(r.releaseAudio);

    // One-shot pads ring on
    r = resolveRelease(true, true, false);
    CHECK(r.record);
    CHECK_FALSE(r.releaseAudio);
}

TEST_CASE("computeGain") {
    CHECK(computeGain(true, false, false) == 0.0f);
    CHECK(computeGain(false, false, true) == 0.0f);
    CHECK(computeGain(false, true, true) == 1.0f);
    CHECK(computeGain(false, false, false) == 1.0f);
}

TEST_CASE("calcTriggerParams") {
    // 1 s of sample at double speed lasts 0.5 s, shorter than the 2 s event
    auto p = calcTriggerParams(pad(0, 1.0), 2, 2, 3);
    CHECK(p.duration == doctest::Approx(0.5));
    CHECK(p.offset == doctest::Approx(0));

    CHECK(calcTriggerParams(pad(0, 2.0), 1, 0.25, 3).duration == doctest::Approx(0.25));
    CHECK(calcTriggerParams(pad(), 1, 0.75, 3).duration == doctest::Approx(0.75));
    CHECK(calcTriggerParams(pad(0.5, 1.5, true), 1, 0.1, 3).duration == doctest::Approx(1));
    // 2.5 s of buffer left after a 0.5 s start, at double speed
    CHECK(calcTriggerParams(pad(0.5, std::nullopt, true), 2, 0.1, 3).duration ==
          doctest::Approx(1.25));
    CHECK(calcTriggerParams(pad(0.5, 2.0, false, true), 1, 1, 3).offset == doctest::Approx(1));
    CHECK(calcTriggerParams(pad(0, std::nullopt, false, true), 1, 1, 3).offset ==
          doctest::Approx(0));
    CHECK(calcTriggerParams(pad(0.4), 1, 1, 3).offset == doctest::Approx(0.4));
    // An end point of 0 counts as unset
    CHECK(calcTriggerParams(pad(0, 0.0), 1, 0.75, 3).duration == doctest::Approx(0.75));
}

TEST_CASE("calcReleaseDelay") {
    CHECK(calcReleaseDelay(0.5, 2.0, 3) == doctest::Approx(1.5));
    CHECK(calcReleaseDelay(0.5, std::nullopt, 3) == doctest::Approx(2.5));
    CHECK(calcReleaseDelay(0, std::nullopt, 3, 2) == doctest::Approx(1.5));
}

TEST_CASE("swingOffsetSeconds follows Tone.js") {
    // No swing on beats, none with swing off
    CHECK(swingOffsetSeconds(192, 1.0, 120) == doctest::Approx(0));
    CHECK(swingOffsetSeconds(96, 0.0, 120) == doctest::Approx(0));
    // The off-beat eighth is pushed by a third of a beat times the swing
    CHECK(swingOffsetSeconds(96, 1.0, 120) == doctest::Approx(0.5 / 3));
    CHECK(swingOffsetSeconds(96 + 192, 0.5, 120) == doctest::Approx(0.25 / 3));
    // Sixteenths are pushed less, along a sine
    CHECK(swingOffsetSeconds(48, 1.0, 120) == doctest::Approx(std::sin(0.25 * M_PI) * 0.5 / 3));
}
