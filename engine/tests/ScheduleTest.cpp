#include <doctest/doctest.h>

#include "citizen/Schedule.h"

using namespace citizen;

namespace {
const LoopTiming kLive{120.0, 4, 2};

SampleEvent hit(std::optional<double> ticks, std::string note = "C4", double velocity = 1) {
    return SampleEvent{ticks, 0.25, std::move(note), velocity};
}

PadState padWith(std::vector<SampleEvent> events, bool quantize = false,
                 std::string quantVal = "4") {
    PadState pad;
    pad.events[loopIndex(Loop::A)] = std::move(events);
    pad.settings.quantize = quantize;
    pad.settings.quantVal = std::move(quantVal);
    return pad;
}

std::vector<double> times(const std::vector<ScheduledHit>& hits) {
    std::vector<double> out;
    for (const auto& h : hits) out.push_back(h.time);
    return out;
}
} // namespace

TEST_CASE("buildSchedule converts ticks to seconds") {
    auto hits = buildSchedule(padWith({hit(192, "D4", 0.5)}), Loop::A, kLive);
    REQUIRE(hits.size() == 1);
    CHECK(hits[0].time == doctest::Approx(0.5));
    CHECK(hits[0].note == "D4");
    CHECK(hits[0].velocity == doctest::Approx(0.5));
    CHECK(hits[0].duration == doctest::Approx(0.25));
}

TEST_CASE("buildSchedule keeps a hit at the very start") {
    CHECK(times(buildSchedule(padWith({hit(0)}), Loop::A, kLive)) == std::vector<double>{0});
}

TEST_CASE("buildSchedule skips hits without a start") {
    auto hits = buildSchedule(padWith({hit(std::nullopt), hit(192)}), Loop::A, kLive);
    REQUIRE(hits.size() == 1);
    CHECK(hits[0].time == doctest::Approx(0.5));
}

TEST_CASE("buildSchedule quantizes when the pad asks for it") {
    auto hits = buildSchedule(padWith({hit(200)}, true, "4"), Loop::A, kLive);
    CHECK(hits[0].time == doctest::Approx(0.5));
}

TEST_CASE("buildSchedule moves a hit snapped onto the loop end to the start") {
    auto hits = buildSchedule(padWith({hit(1530)}, true, "4"), Loop::A, kLive);
    CHECK(hits[0].time == 0.0);
}

TEST_CASE("buildSchedule plays hits at the same time and note once") {
    auto hits = buildSchedule(padWith({hit(190), hit(194), hit(194, "E4")}, true, "4"), Loop::A,
                              kLive);
    REQUIRE(hits.size() == 2);
    CHECK(hits[0].note == "C4");
    CHECK(hits[1].note == "E4");
}

TEST_CASE("buildSchedule reads only the requested loop") {
    PadState pad = padWith({hit(0)});
    pad.events[loopIndex(Loop::B)] = {hit(96), hit(192)};
    CHECK(buildSchedule(pad, Loop::B, kLive).size() == 2);
    CHECK(buildSchedule(pad, Loop::C, kLive).empty());
}

TEST_CASE("buildSchedule uses the loop's own timing") {
    const LoopTiming slow{60.0, 3, 1};
    CHECK(buildSchedule(padWith({hit(192)}), Loop::A, slow)[0].time == doctest::Approx(1));
    CHECK(buildSchedule(padWith({hit(250)}, true), Loop::A, slow)[0].time == doctest::Approx(1));
    CHECK(buildSchedule(padWith({hit(570)}, true), Loop::A, slow)[0].time == 0.0);
}

TEST_CASE("calcRenderDuration") {
    auto at = [](double time, std::optional<double> duration) {
        return ScheduledHit{time, "C4", 1.0, duration};
    };
    CHECK(calcRenderDuration({at(0, 0.5), at(2, 1)}, 4) == doctest::Approx(4));
    CHECK(calcRenderDuration({at(3.5, 1.25)}, 4) == doctest::Approx(4.75));
    CHECK(calcRenderDuration({at(3.9, 0.5), at(0, 0.5)}, 4) == doctest::Approx(4.4));
    CHECK(calcRenderDuration({at(3.5, std::nullopt)}, 4) == doctest::Approx(4));
    CHECK(calcRenderDuration({}, 4) == doctest::Approx(4));
}
