#include <doctest/doctest.h>

#include <vector>

#include "citizen/Voice.h"

using namespace citizen;

namespace {
// A mono ramp 0, 1, 2, ... so each output sample shows where the voice read
SampleBuffer ramp(int frames, double sampleRate = 100.0) {
    SampleBuffer b;
    b.sampleRate = sampleRate;
    b.channels.assign(1, std::vector<float>(frames));
    for (int i = 0; i < frames; ++i) b.channels[0][i] = static_cast<float>(i);
    return b;
}

std::vector<float> renderLeft(Voice& v, int frames) {
    std::vector<float> l(frames, 0.0f), r(frames, 0.0f);
    v.render(l.data(), r.data(), frames);
    return l;
}
} // namespace

TEST_CASE("a voice reads the buffer from its offset") {
    SampleBuffer b = ramp(10);
    Voice v;
    v.start({&b, 0.03, 1.0}, 100.0);
    auto out = renderLeft(v, 3);
    CHECK(out == std::vector<float>{3, 4, 5});
}

TEST_CASE("a voice steps through the buffer at its playback rate") {
    SampleBuffer b = ramp(10);
    Voice v;
    v.start({&b, 0.0, 2.0}, 100.0);
    CHECK(renderLeft(v, 3) == std::vector<float>{0, 2, 4});
}

TEST_CASE("a voice converts between buffer and output sample rates") {
    SampleBuffer b = ramp(10, 200.0);
    Voice v;
    v.start({&b, 0.0, 1.0}, 100.0);
    CHECK(renderLeft(v, 3) == std::vector<float>{0, 2, 4});
}

TEST_CASE("a voice stops at the end of its buffer") {
    SampleBuffer b = ramp(3);
    Voice v;
    v.start({&b, 0.0, 1.0}, 100.0);
    auto out = renderLeft(v, 5);
    CHECK(out == std::vector<float>{0, 1, 2, 0, 0});
    CHECK_FALSE(v.active());
}

TEST_CASE("a voice waits out its delay") {
    SampleBuffer b = ramp(10);
    Voice v;
    Voice::Start s{&b, 0.0, 1.0};
    s.delayFrames = 2;
    v.start(s, 100.0);
    CHECK(renderLeft(v, 4) == std::vector<float>{0, 0, 0, 1});
}

TEST_CASE("a voice scales by velocity and fades in over the attack") {
    SampleBuffer b;
    b.sampleRate = 100.0;
    b.channels.assign(1, std::vector<float>(10, 1.0f));
    Voice v;
    Voice::Start s{&b, 0.0, 1.0, 0.5f};
    s.attackSeconds = 0.04; // 4 frames
    v.start(s, 100.0);
    auto out = renderLeft(v, 5);
    CHECK(out[0] == doctest::Approx(0.0));
    CHECK(out[2] == doctest::Approx(0.25));
    CHECK(out[4] == doctest::Approx(0.5));
}

TEST_CASE("a released voice fades out and ends") {
    SampleBuffer b;
    b.sampleRate = 100.0;
    b.channels.assign(1, std::vector<float>(100, 1.0f));
    Voice v;
    Voice::Start s{&b, 0.0, 1.0};
    s.releaseSeconds = 0.02; // 2 frames
    v.start(s, 100.0);
    v.releaseAfter(1);
    auto out = renderLeft(v, 5);
    CHECK(out == std::vector<float>{1, 1, 0.5f, 0, 0});
    CHECK_FALSE(v.active());
}

TEST_CASE("a release with no fade cuts the voice") {
    SampleBuffer b = ramp(100);
    Voice v;
    v.start({&b, 0.0, 1.0}, 100.0);
    v.releaseAfter(2);
    CHECK(renderLeft(v, 4) == std::vector<float>{0, 1, 0, 0});
}

TEST_CASE("a stereo buffer keeps its channels") {
    SampleBuffer b;
    b.sampleRate = 100.0;
    b.channels = {{1, 1}, {2, 2}};
    Voice v;
    v.start({&b, 0.0, 1.0}, 100.0);
    std::vector<float> l(2, 0.0f), r(2, 0.0f);
    v.render(l.data(), r.data(), 2);
    CHECK(l == std::vector<float>{1, 1});
    CHECK(r == std::vector<float>{2, 2});
}
