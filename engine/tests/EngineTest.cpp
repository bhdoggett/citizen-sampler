#include <doctest/doctest.h>

#include <cmath>
#include <memory>
#include <vector>

#include "citizen/Engine.h"

using namespace citizen;

namespace {
// A low rate keeps buffers small: 1000 frames per second
constexpr double kRate = 1000.0;
const LoopTiming kTiming{120.0, 4, 2}; // 4 s loop

std::shared_ptr<const SampleBuffer> constant(double seconds, float value = 1.0f) {
    auto b = std::make_shared<SampleBuffer>();
    b->sampleRate = kRate;
    b->channels.assign(2, std::vector<float>(static_cast<size_t>(seconds * kRate), value));
    return b;
}

AllLoopSettings loops(double swing = 0.0) {
    AllLoopSettings all{};
    all[0] = LoopSettings{kTiming, swing, true};
    return all;
}

struct Rig {
    Engine engine;
    std::vector<Event> events;

    Rig() {
        engine.prepare(kRate, 100);
        engine.handle(cmd::SetLoops{loops()});
    }

    void addPad(const std::string& id, PadState pad = {}, double seconds = 2.0) {
        if (pad.url.empty()) pad.url = "https://example.com/" + id + ".wav";
        engine.handle(cmd::SetPad{id, pad});
        engine.setPadBuffer(id, pad.url, constant(seconds));
    }

    // Process `seconds` of audio and return the left channel
    std::vector<float> run(double seconds) {
        const int frames = static_cast<int>(std::lround(seconds * kRate));
        std::vector<float> l(frames), r(frames);
        float* out[] = {l.data(), r.data()};
        engine.process(out, 2, frames);
        for (auto& e : engine.takeEvents()) events.push_back(std::move(e));
        return l;
    }

    template <class T>
    std::vector<T> eventsOf() const {
        std::vector<T> out;
        for (const auto& e : events) {
            if (auto* x = std::get_if<T>(&e)) out.push_back(*x);
        }
        return out;
    }
};

double peak(const std::vector<float>& x, size_t from = 0, size_t to = SIZE_MAX) {
    double p = 0;
    for (size_t i = from; i < std::min(to, x.size()); ++i) p = std::max(p, std::abs(double(x[i])));
    return p;
}

SampleEvent hitAt(double ticks, double duration = 0.1, std::string note = "C4") {
    return SampleEvent{ticks, duration, std::move(note), 1.0};
}
} // namespace

TEST_CASE("a pressed pad sounds until it is released") {
    Rig rig;
    rig.addPad("pad-1");
    CHECK(peak(rig.run(0.05)) == 0.0);

    rig.engine.handle(cmd::Press{"pad-1", "C4", 1.0});
    CHECK(peak(rig.run(0.1)) > 0.5);
    rig.engine.handle(cmd::Release{"pad-1", "C4"});
    rig.run(0.01);
    CHECK(peak(rig.run(0.1)) == 0.0);

    CHECK(rig.eventsOf<evt::VoiceStarted>().size() == 1);
    CHECK(rig.eventsOf<evt::VoiceEnded>().size() == 1);
}

TEST_CASE("a pad with no sample loaded stays silent") {
    Rig rig;
    rig.engine.handle(cmd::SetPad{"pad-1", PadState{"https://example.com/a.wav"}});
    rig.engine.handle(cmd::Press{"pad-1", "C4", 1.0});
    CHECK(peak(rig.run(0.1)) == 0.0);
    CHECK(rig.eventsOf<evt::VoiceStarted>().empty());
}

TEST_CASE("a pressed sound ends on its own at the end of the sample") {
    Rig rig;
    rig.addPad("pad-1", {}, 0.2);
    rig.engine.handle(cmd::Press{"pad-1", "C4", 1.0});
    rig.run(0.5);
    CHECK(rig.eventsOf<evt::VoiceEnded>().size() == 1);
}

TEST_CASE("the host is asked for each pad's sample, and stale loads are ignored") {
    Rig rig;
    rig.engine.handle(cmd::SetPad{"pad-1", PadState{"https://example.com/new.wav"}});
    auto needed = rig.engine.padsNeedingAudio();
    REQUIRE(needed.size() == 1);
    CHECK(needed[0].second == "https://example.com/new.wav");

    rig.engine.setPadBuffer("pad-1", "https://example.com/old.wav", constant(1));
    CHECK(rig.engine.padsNeedingAudio().size() == 1);
    rig.engine.setPadBuffer("pad-1", "https://example.com/new.wav", constant(1));
    CHECK(rig.engine.padsNeedingAudio().empty());
    rig.run(0.01);
    REQUIRE(rig.eventsOf<evt::PadLoaded>().size() == 1);
    CHECK(rig.eventsOf<evt::PadLoaded>()[0].duration == doctest::Approx(1.0));
}

TEST_CASE("recorded hits play back in the loop") {
    Rig rig;
    PadState pad;
    pad.events[0] = {hitAt(384)}; // 1 s in
    rig.addPad("pad-1", pad);
    rig.engine.handle(cmd::Play{});

    auto out = rig.run(1.5);
    CHECK(peak(out, 0, 990) == 0.0);
    CHECK(peak(out, 1000, 1090) > 0.5);
    CHECK(peak(out, 1150) == 0.0);

    auto started = rig.eventsOf<evt::VoiceStarted>();
    REQUIRE(started.size() == 1);
    CHECK(started[0].padId == "pad-1");
    CHECK(rig.eventsOf<evt::VoiceEnded>().size() == 1);
}

TEST_CASE("playback goes round the loop and re-anchors the transport") {
    Rig rig;
    PadState pad;
    pad.events[0] = {hitAt(0)};
    rig.addPad("pad-1", pad);
    rig.engine.handle(cmd::Play{});
    rig.run(4.5);

    CHECK(rig.eventsOf<evt::VoiceStarted>().size() == 2);
    auto transport = rig.eventsOf<evt::Transport>();
    REQUIRE(transport.size() >= 2);
    CHECK(transport.back().playing);
    CHECK(transport.back().position == 0.0);
    CHECK(transport.back().loopDuration == doctest::Approx(4.0));
    CHECK(rig.engine.position() == doctest::Approx(0.5));
}

TEST_CASE("swing delays off-beat hits") {
    Rig rig;
    rig.engine.handle(cmd::SetLoops{loops(1.0)});
    PadState pad;
    pad.events[0] = {hitAt(96)}; // the off-beat eighth, 0.25 s
    rig.addPad("pad-1", pad);
    rig.engine.handle(cmd::Play{});
    auto out = rig.run(1.0);
    // Pushed by a third of a beat: 0.25 + 0.5 / 3 s
    const size_t expected = static_cast<size_t>((0.25 + 0.5 / 3) * kRate);
    CHECK(peak(out, 0, expected - 2) == 0.0);
    CHECK(peak(out, expected, expected + 50) > 0.5);
}

TEST_CASE("recording commits a hit when the pad is released") {
    Rig rig;
    rig.addPad("pad-1");
    rig.engine.handle(cmd::SetRecording{true});
    rig.engine.handle(cmd::Play{});
    rig.run(1.0);
    rig.engine.handle(cmd::Press{"pad-1", "C4", 0.8});
    rig.run(0.25);
    rig.engine.handle(cmd::Release{"pad-1", "C4"});

    auto hits = rig.engine.takeEvents();
    std::vector<evt::HitRecorded> recorded;
    for (auto& e : hits) {
        if (auto* h = std::get_if<evt::HitRecorded>(&e)) recorded.push_back(*h);
    }
    REQUIRE(recorded.size() == 1);
    CHECK(recorded[0].padId == "pad-1");
    CHECK(recorded[0].loop == Loop::A);
    CHECK(*recorded[0].event.startTicks == doctest::Approx(384));
    CHECK(*recorded[0].event.duration == doctest::Approx(0.25));
    CHECK(recorded[0].event.velocity == doctest::Approx(0.8));
}

TEST_CASE("stopping ends recording and returns to the top") {
    Rig rig;
    rig.engine.handle(cmd::SetRecording{true});
    rig.engine.handle(cmd::Play{});
    rig.run(1.0);
    rig.engine.handle(cmd::Stop{});
    auto transport = rig.engine.takeEvents();
    auto* last = std::get_if<evt::Transport>(&transport.back());
    REQUIRE(last);
    CHECK_FALSE(last->playing);
    CHECK_FALSE(last->recording);
    CHECK(rig.engine.position() == 0.0);
}

TEST_CASE("mute and solo silence pads") {
    Rig rig;
    PadState muted;
    muted.settings.mute = true;
    rig.addPad("pad-1", muted);
    rig.engine.handle(cmd::Press{"pad-1", "C4", 1.0});
    CHECK(peak(rig.run(0.2)) == 0.0);

    Rig rig2;
    PadState soloed;
    soloed.settings.solo = true;
    rig2.addPad("pad-1");
    rig2.addPad("pad-2", soloed);
    rig2.engine.handle(cmd::Press{"pad-1", "C4", 1.0});
    CHECK(peak(rig2.run(0.2)) == 0.0);
    rig2.engine.handle(cmd::Press{"pad-2", "C4", 1.0});
    CHECK(peak(rig2.run(0.2)) > 0.5);
}

TEST_CASE("volume and pan shape a pad's output") {
    Rig rig;
    PadState pad;
    pad.settings.volume = -6.0;
    pad.settings.pan = 1.0;
    rig.addPad("pad-1", pad);
    rig.engine.handle(cmd::Press{"pad-1", "C4", 1.0});
    std::vector<float> l(100), r(100);
    float* out[] = {l.data(), r.data()};
    rig.engine.process(out, 2, 100);
    // A stereo source panned hard right folds left into right
    CHECK(peak(l) == doctest::Approx(0).epsilon(1e-6));
    CHECK(peak(r) == doctest::Approx(2 * 0.501).epsilon(0.01));
}

TEST_CASE("the metronome clicks on every beat while playing") {
    Rig rig;
    auto click = constant(0.01);
    rig.engine.setMetronomeBuffers(click, click);
    rig.engine.handle(cmd::SetMetronome{true});
    rig.engine.handle(cmd::Play{});
    auto out = rig.run(1.2);
    CHECK(peak(out, 0, 5) > 0.5);
    CHECK(peak(out, 20, 490) == 0.0);
    CHECK(peak(out, 500, 505) > 0.5);
    CHECK(peak(out, 1000, 1005) > 0.5);
}

TEST_CASE("switching loops restarts from the top") {
    Rig rig;
    AllLoopSettings all = loops();
    all[1] = LoopSettings{{60.0, 3, 1}, 0.0, true};
    rig.engine.handle(cmd::SetLoops{all});
    rig.engine.handle(cmd::Play{});
    rig.run(1.0);
    rig.engine.handle(cmd::SetCurrentLoop{Loop::B});
    CHECK(rig.engine.position() == 0.0);
    auto events = rig.engine.takeEvents();
    auto* t = std::get_if<evt::Transport>(&events.back());
    REQUIRE(t);
    CHECK(t->loop == Loop::B);
    CHECK(t->loopDuration == doctest::Approx(3.0));
}

TEST_CASE("a sample preview plays and reports its end") {
    Rig rig;
    rig.engine.handle(cmd::PreviewSample{"https://example.com/p.wav"});
    REQUIRE(rig.engine.previewUrl());
    rig.engine.setPreviewBuffer("https://example.com/p.wav", constant(0.1));
    CHECK(peak(rig.run(0.05)) > 0.5);
    rig.run(0.2);
    CHECK(rig.eventsOf<evt::PreviewStarted>().size() == 1);
    CHECK(rig.eventsOf<evt::PreviewEnded>().size() == 1);
    CHECK_FALSE(rig.engine.previewUrl());
}

TEST_CASE("the host is asked to load a preview once") {
    Rig rig;
    rig.engine.handle(cmd::PreviewSample{"https://example.com/p.wav"});
    CHECK(rig.engine.takePreviewRequest() == std::optional<std::string>("https://example.com/p.wav"));
    CHECK_FALSE(rig.engine.takePreviewRequest());
    rig.engine.handle(cmd::Play{});
    CHECK_FALSE(rig.engine.takePreviewRequest());
}

TEST_CASE("a pad whose sample failed to load is not asked for again") {
    Rig rig;
    rig.engine.handle(cmd::SetPad{"pad-1", PadState{"https://example.com/broken.wav"}});
    rig.engine.setPadLoadFailed("pad-1", "https://example.com/broken.wav", "404");
    CHECK(rig.engine.padsNeedingAudio().empty());
    rig.engine.handle(cmd::SetPad{"pad-1", PadState{"https://example.com/other.wav"}});
    CHECK(rig.engine.padsNeedingAudio().size() == 1);
}
