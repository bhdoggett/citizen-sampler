#pragma once

#include <cmath>

namespace citizen::dsp {

// RBJ cookbook biquad, 12 dB per octave with Q = 1: the default shape of
// Tone.Filter. One instance per channel.
class Biquad {
public:
    enum class Type { LowPass, HighPass };

    void set(Type type, double frequency, double sampleRate, double q = 1.0) {
        const double w0 = 2.0 * M_PI * frequency / sampleRate;
        const double cosw = std::cos(w0);
        const double alpha = std::sin(w0) / (2.0 * q);
        const double a0 = 1.0 + alpha;
        if (type == Type::LowPass) {
            b0_ = (1.0 - cosw) / 2.0 / a0;
            b1_ = (1.0 - cosw) / a0;
            b2_ = b0_;
        } else {
            b0_ = (1.0 + cosw) / 2.0 / a0;
            b1_ = -(1.0 + cosw) / a0;
            b2_ = b0_;
        }
        a1_ = -2.0 * cosw / a0;
        a2_ = (1.0 - alpha) / a0;
    }

    float process(float x) {
        const double y = b0_ * x + z1_;
        z1_ = b1_ * x - a1_ * y + z2_;
        z2_ = b2_ * x - a2_ * y;
        return static_cast<float>(y);
    }

    void reset() { z1_ = z2_ = 0.0; }

private:
    double b0_ = 1, b1_ = 0, b2_ = 0, a1_ = 0, a2_ = 0;
    double z1_ = 0, z2_ = 0;
};

} // namespace citizen::dsp
