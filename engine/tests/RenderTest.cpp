#include <doctest/doctest.h>

#include <cmath>
#include <memory>

#include "citizen/Engine.h"

using namespace citizen;

namespace {
constexpr double kRate = 1000.0;

std::shared_ptr<const SampleBuffer> constant(double seconds) {
    auto b = std::make_shared<SampleBuffer>();
    b->sampleRate = kRate;
    b->channels.assign(1, std::vector<float>(static_cast<size_t>(seconds * kRate), 1.0f));
    return b;
}

std::unique_ptr<Engine> engineWith(PadState pad, double swing = 0.0, bool soloOther = false) {
    auto owned = std::make_unique<Engine>();
    Engine& engine = *owned;
    engine.prepare(kRate, 128);
    AllLoopSettings loops{};
    loops[1] = LoopSettings{{120.0, 4, 1}, swing, true}; // loop B: 2 s
    engine.handle(cmd::SetLoops{loops});
    pad.url = "https://example.com/a.wav";
    engine.handle(cmd::SetPad{"pad-1", pad});
    engine.setPadBuffer("pad-1", pad.url, constant(1.0));
    if (soloOther) {
        PadState other;
        other.url = "https://example.com/b.wav";
        other.settings.solo = true;
        engine.handle(cmd::SetPad{"pad-2", other});
    }
    return owned;
}

double peak(const std::vector<float>& x, size_t from, size_t to) {
    double p = 0;
    for (size_t i = from; i < std::min(to, x.size()); ++i) p = std::max(p, std::abs(double(x[i])));
    return p;
}
} // namespace

TEST_CASE("a stem covers its loop with each hit in place") {
    PadState pad;
    pad.events[1] = {SampleEvent{192.0, 0.25, "C4", 1.0}}; // 0.5 s in
    auto engine = engineWith(pad);

    auto stem = engine->renderStem("pad-1", Loop::B, kRate);
    REQUIRE(stem);
    CHECK(stem->channels.size() == 2);
    CHECK(stem->numFrames() == 2000);
    const auto& left = stem->channels[0];
    CHECK(peak(left, 0, 495) == 0.0);
    CHECK(peak(left, 505, 740) > 0.5);
    CHECK(peak(left, 760, 2000) == 0.0);
}

TEST_CASE("a stem runs past the loop end for hits that ring over") {
    PadState pad;
    pad.events[1] = {SampleEvent{672.0, 0.5, "C4", 1.0}}; // 1.75 s in
    auto engine = engineWith(pad);
    auto stem = engine->renderStem("pad-1", Loop::B, kRate);
    REQUIRE(stem);
    CHECK(stem->numFrames() == 2250);
}

TEST_CASE("no stem for a loop with no hits or no settings") {
    PadState pad;
    auto engine = engineWith(pad);
    CHECK_FALSE(engine->renderStem("pad-1", Loop::B, kRate));
    CHECK_FALSE(engine->renderStem("pad-1", Loop::A, kRate));
    CHECK_FALSE(engine->renderStem("pad-9", Loop::B, kRate));
}

TEST_CASE("a pad silenced by another pad's solo renders a silent stem") {
    PadState pad;
    pad.events[1] = {SampleEvent{0.0, 0.25, "C4", 1.0}};
    auto engine = engineWith(pad, 0.0, true);
    auto stem = engine->renderStem("pad-1", Loop::B, kRate);
    REQUIRE(stem);
    CHECK(peak(stem->channels[0], 0, 2000) == 0.0);
}
