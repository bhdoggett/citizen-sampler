#include <doctest/doctest.h>

#include <map>
#include <vector>

#include "citizen/LiveInput.h"

using namespace citizen;

namespace {
// Mirrors the harness in liveInput.test.ts. 120 bpm, 4 beats, 2 bars: a 4 s
// loop of 1536 ticks.
struct Harness {
    bool recording = true;
    double ticks = 0;
    double seconds = 0;
    Loop loop = Loop::A;
    bool oneShot = false;
    std::optional<double> soundSeconds = 0.5;

    std::vector<Event> events;
    std::vector<std::string> attacks, releases;
    std::map<int, std::function<void()>> timers;
    int nextTimer = 1;

    LiveInput::Deps deps() {
        LiveInput::Deps d;
        d.attack = [this](const std::string& pad, const std::string& note, double) {
            if (soundSeconds) attacks.push_back(pad + ":" + note);
            return soundSeconds;
        };
        d.releaseVoice = [this](const std::string& pad, const std::string& note) {
            releases.push_back(pad + ":" + note);
        };
        d.padSettings = [this](const std::string&) {
            SampleSettings s;
            s.oneShot = oneShot;
            return s;
        };
        d.recordingPosition = [this]() -> std::optional<LiveInput::Position> {
            if (!recording) return std::nullopt;
            return LiveInput::Position{loop, ticks};
        };
        d.isRecording = [this] { return recording; };
        d.transportSeconds = [this] { return seconds; };
        d.loopTiming = [](Loop) { return std::optional<LoopTiming>(LoopTiming{120, 4, 2}); };
        d.emit = [this](Event e) { events.push_back(std::move(e)); };
        d.setTimer = [this](double, std::function<void()> fn) {
            const int id = nextTimer++;
            timers[id] = std::move(fn);
            return id;
        };
        d.cancelTimer = [this](int id) { timers.erase(id); };
        return d;
    }

    void fireTimers() {
        auto pending = std::move(timers);
        timers.clear();
        for (auto& [id, fn] : pending) fn();
    }

    std::vector<evt::HitRecorded> hits() const {
        std::vector<evt::HitRecorded> out;
        for (const auto& e : events) {
            if (auto* h = std::get_if<evt::HitRecorded>(&e)) out.push_back(*h);
        }
        return out;
    }
};
} // namespace

TEST_CASE("records one hit per press with the duration measured at release") {
    Harness h;
    LiveInput input(h.deps());
    h.ticks = 384;
    h.seconds = 1;
    input.press("pad-1", "C4", 1);
    h.seconds = 1.25;
    input.release("pad-1", "C4");

    auto hits = h.hits();
    REQUIRE(hits.size() == 1);
    CHECK(hits[0].padId == "pad-1");
    CHECK(hits[0].loop == Loop::A);
    CHECK(*hits[0].event.startTicks == doctest::Approx(384));
    CHECK(*hits[0].event.duration == doctest::Approx(0.25));
    CHECK(h.releases == std::vector<std::string>{"pad-1:C4"});
}

TEST_CASE("still records a hit after the sound stopped on its own") {
    Harness h;
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    h.fireTimers();
    h.seconds = 2;
    input.release("pad-1", "C4");
    CHECK(h.hits().size() == 1);
    CHECK(h.releases == std::vector<std::string>{"pad-1:C4"});
}

TEST_CASE("lets one-shot pads ring on but still records the hit") {
    Harness h;
    h.oneShot = true;
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    h.seconds = 0.1;
    input.release("pad-1", "C4");
    CHECK(h.releases.empty());
    CHECK(h.hits().size() == 1);
    h.fireTimers();
    CHECK(h.releases == std::vector<std::string>{"pad-1:C4"});
}

TEST_CASE("records nothing when not recording, or when recording stops first") {
    Harness h;
    h.recording = false;
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    CHECK(h.hits().empty());

    Harness h2;
    LiveInput input2(h2.deps());
    input2.press("pad-1", "C4", 1);
    h2.recording = false;
    input2.release("pad-1", "C4");
    CHECK(h2.hits().empty());
}

TEST_CASE("ignores a release without a press") {
    Harness h;
    LiveInput input(h.deps());
    input.release("pad-1", "C4");
    CHECK(h.events.empty());
    CHECK(h.releases.empty());
}

TEST_CASE("records a quick tap as a short hit, not a whole loop") {
    Harness h;
    LiveInput input(h.deps());
    h.ticks = 384;
    h.seconds = 0.999;
    input.press("pad-1", "C4", 1);
    h.seconds = 1.0;
    input.release("pad-1", "C4");
    CHECK(*h.hits()[0].event.duration == doctest::Approx(0.001));
}

TEST_CASE("measures a hit held across the loop end") {
    Harness h;
    LiveInput input(h.deps());
    h.ticks = 1440;
    h.seconds = 3.75;
    input.press("pad-1", "C4", 1);
    h.seconds = 0.25;
    input.release("pad-1", "C4");
    CHECK(*h.hits()[0].event.duration == doctest::Approx(0.5));
}

TEST_CASE("folds a start read just past the loop end back to the top") {
    Harness h;
    LiveInput input(h.deps());
    h.ticks = 1536 + 10;
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    CHECK(*h.hits()[0].event.startTicks == doctest::Approx(10));
}

TEST_CASE("holds several notes on one pad independently") {
    Harness h;
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    h.ticks = 192;
    input.press("pad-1", "E4", 0.5);
    h.seconds = 1;
    input.release("pad-1", "E4");
    input.release("pad-1", "C4");
    auto hits = h.hits();
    REQUIRE(hits.size() == 2);
    CHECK(hits[0].event.note == "E4");
    CHECK(*hits[0].event.startTicks == doctest::Approx(192));
    CHECK(hits[0].event.velocity == doctest::Approx(0.5));
    CHECK(hits[1].event.note == "C4");
}

TEST_CASE("restarts a held note and replaces its pending hit") {
    Harness h;
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    h.ticks = 384;
    input.press("pad-1", "C4", 1);
    CHECK(h.timers.size() == 1);
    input.release("pad-1", "C4");
    auto hits = h.hits();
    REQUIRE(hits.size() == 1);
    CHECK(*hits[0].event.startTicks == doctest::Approx(384));
}

TEST_CASE("does nothing for a pad with no sound loaded") {
    Harness h;
    h.soundSeconds.reset();
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    CHECK(h.events.empty());
}

TEST_CASE("releases every held voice on reset") {
    Harness h;
    LiveInput input(h.deps());
    input.press("pad-1", "C4", 1);
    input.press("pad-2", "C4", 1);
    input.reset();
    CHECK(h.releases.size() == 2);
    CHECK(h.timers.empty());
    input.release("pad-1", "C4");
    CHECK(h.hits().empty());
}
