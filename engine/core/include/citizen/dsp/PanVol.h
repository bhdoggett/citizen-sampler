#pragma once

#include <cmath>

namespace citizen::dsp {

inline float dbToGain(double db) { return static_cast<float>(std::pow(10.0, db / 20.0)); }

// The Web Audio StereoPannerNode rules, which Tone.PanVol uses: equal power
// for mono sources; for stereo, the far channel folds into the near one.
struct PanGains {
    float ll, rl, lr, rr; // out = in * gain, e.g. outL = inL*ll + inR*rl
};

inline PanGains panGains(double pan, bool monoSource) {
    const double p = std::fmax(-1.0, std::fmin(1.0, pan));
    if (monoSource) {
        const double x = (p + 1.0) / 2.0;
        const float l = static_cast<float>(std::cos(x * M_PI / 2.0));
        const float r = static_cast<float>(std::sin(x * M_PI / 2.0));
        // Both channels carry the same signal, so read the left one only
        return {l, 0.0f, r, 0.0f};
    }
    const double x = p <= 0 ? p + 1.0 : p;
    const float gl = static_cast<float>(std::cos(x * M_PI / 2.0));
    const float gr = static_cast<float>(std::sin(x * M_PI / 2.0));
    if (p <= 0) return {1.0f, gl, 0.0f, gr};
    return {gl, 0.0f, gr, 1.0f};
}

} // namespace citizen::dsp
