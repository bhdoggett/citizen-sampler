#include <doctest/doctest.h>

#include <cmath>
#include <vector>

#include "citizen/dsp/Biquad.h"
#include "citizen/dsp/PanVol.h"
#include "citizen/dsp/PitchShifter.h"

using namespace citizen::dsp;

namespace {
constexpr double kRate = 44100.0;

std::vector<float> sine(double frequency, int frames) {
    std::vector<float> out(frames);
    for (int i = 0; i < frames; ++i) out[i] = static_cast<float>(std::sin(2 * M_PI * frequency * i / kRate));
    return out;
}

double rms(const std::vector<float>& x, int from) {
    double sum = 0;
    for (size_t i = from; i < x.size(); ++i) sum += x[i] * x[i];
    return std::sqrt(sum / (x.size() - from));
}

// Frequency from rising zero crossings
double measureFrequency(const std::vector<float>& x, int from) {
    int crossings = 0;
    for (size_t i = from + 1; i < x.size(); ++i) {
        if (x[i - 1] < 0 && x[i] >= 0) ++crossings;
    }
    return crossings * kRate / (x.size() - from);
}
} // namespace

TEST_CASE("a low-pass passes low tones and cuts high ones") {
    Biquad lp;
    lp.set(Biquad::Type::LowPass, 1000, kRate);
    auto low = sine(100, 8820);
    for (auto& s : low) s = lp.process(s);
    CHECK(rms(low, 4410) == doctest::Approx(1 / std::sqrt(2)).epsilon(0.02));

    lp.reset();
    auto high = sine(10000, 8820);
    for (auto& s : high) s = lp.process(s);
    CHECK(rms(high, 4410) < 0.02);
}

TEST_CASE("a high-pass blocks DC") {
    Biquad hp;
    hp.set(Biquad::Type::HighPass, 200, kRate);
    float last = 1;
    for (int i = 0; i < 44100; ++i) last = hp.process(1.0f);
    CHECK(std::abs(last) < 1e-3);
}

TEST_CASE("panning a mono source is equal power") {
    auto center = panGains(0, true);
    CHECK(center.ll == doctest::Approx(std::sqrt(0.5)));
    CHECK(center.lr == doctest::Approx(std::sqrt(0.5)));
    auto left = panGains(-1, true);
    CHECK(left.ll == doctest::Approx(1));
    CHECK(left.lr == doctest::Approx(0).epsilon(1e-6));
}

TEST_CASE("a centered stereo source passes through") {
    auto g = panGains(0, false);
    CHECK(g.ll == doctest::Approx(1));
    CHECK(g.rl == doctest::Approx(0).epsilon(1e-6));
    CHECK(g.lr == doctest::Approx(0));
    CHECK(g.rr == doctest::Approx(1));
}

TEST_CASE("panning a stereo source hard left folds right into left") {
    auto g = panGains(-1, false);
    CHECK(g.ll == doctest::Approx(1));
    CHECK(g.rl == doctest::Approx(1));
    CHECK(g.rr == doctest::Approx(0).epsilon(1e-6));
}

TEST_CASE("dbToGain") {
    CHECK(dbToGain(0) == doctest::Approx(1));
    CHECK(dbToGain(-6) == doctest::Approx(0.501).epsilon(0.01));
}

TEST_CASE("the pitch shifter passes audio through at 0 semitones") {
    PitchShifter ps;
    ps.prepare(kRate);
    auto x = sine(440, 1000);
    auto y = x;
    ps.process(y.data(), nullptr, static_cast<int>(y.size()));
    CHECK(y == x);
}

TEST_CASE("the pitch shifter moves a tone up and down without changing length") {
    for (double semitones : {12.0, -12.0, 0.5}) {
        CAPTURE(semitones);
        PitchShifter ps;
        ps.prepare(kRate);
        ps.setPitch(semitones);
        auto y = sine(440, 44100);
        ps.process(y.data(), nullptr, static_cast<int>(y.size()));
        const double expected = 440 * std::pow(2.0, semitones / 12.0);
        CHECK(measureFrequency(y, 8820) == doctest::Approx(expected).epsilon(0.03));
    }
}
