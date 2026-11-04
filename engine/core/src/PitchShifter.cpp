#include "citizen/dsp/PitchShifter.h"

#include <algorithm>
#include <cmath>

namespace citizen::dsp {

void PitchShifter::prepare(double sampleRate, double windowSeconds) {
    sampleRate_ = sampleRate;
    windowFrames_ = windowSeconds * sampleRate;
    const size_t size = static_cast<size_t>(windowFrames_) + 4;
    lineL_.assign(size, 0.0f);
    lineR_.assign(size, 0.0f);
    setPitch(semitones_);
    reset();
}

void PitchShifter::setPitch(double semitones) {
    semitones_ = semitones;
    // A delay changing at rate d (frames per frame) shifts pitch by 1 - d
    const double ratio = std::pow(2.0, semitones / 12.0);
    rising_ = ratio < 1.0;
    const double sweep = std::abs(1.0 - ratio); // delay frames per frame
    phaseStep_ = windowFrames_ > 0 ? sweep / windowFrames_ : 0.0;
}

void PitchShifter::reset() {
    std::fill(lineL_.begin(), lineL_.end(), 0.0f);
    std::fill(lineR_.begin(), lineR_.end(), 0.0f);
    write_ = 0;
    phase_ = 0.0;
}

float PitchShifter::read(const std::vector<float>& line, double delayFrames) const {
    const double size = static_cast<double>(line.size());
    double pos = write_ - delayFrames;
    while (pos < 0) pos += size;
    const int i0 = static_cast<int>(pos) % static_cast<int>(size);
    const int i1 = (i0 + 1) % static_cast<int>(size);
    const float frac = static_cast<float>(pos - std::floor(pos));
    return line[i0] + (line[i1] - line[i0]) * frac;
}

void PitchShifter::process(float* left, float* right, int frames) {
    if (semitones_ == 0.0 || lineL_.empty()) return;
    const int size = static_cast<int>(lineL_.size());

    for (int n = 0; n < frames; ++n) {
        lineL_[write_] = left[n];
        if (right) lineR_[write_] = right[n];

        const double phaseB = std::fmod(phase_ + 0.5, 1.0);
        auto delayFor = [&](double phase) {
            // Pitch up: the delay shrinks from the window to 0. Down: it grows.
            return (rising_ ? phase : 1.0 - phase) * windowFrames_ + 1.0;
        };
        // Each tap is loudest mid-sweep and silent where its delay jumps
        const float gainA = static_cast<float>(1.0 - std::abs(2.0 * phase_ - 1.0));
        const float gainB = 1.0f - gainA;

        left[n] = read(lineL_, delayFor(phase_)) * gainA + read(lineL_, delayFor(phaseB)) * gainB;
        if (right) {
            right[n] =
                read(lineR_, delayFor(phase_)) * gainA + read(lineR_, delayFor(phaseB)) * gainB;
        }

        write_ = (write_ + 1) % size;
        phase_ += phaseStep_;
        if (phase_ >= 1.0) phase_ -= 1.0;
    }
}

} // namespace citizen::dsp
