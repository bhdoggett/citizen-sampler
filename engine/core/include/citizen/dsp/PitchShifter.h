#pragma once

#include <vector>

namespace citizen::dsp {

// Time-preserving pitch shift for small intervals, the same design as
// Tone.PitchShift: two delay lines swept by sawtooths half a cycle apart,
// crossfaded so each is silent while it jumps. At 0 semitones it passes the
// signal through untouched (Tone's adds a fixed delay there).
class PitchShifter {
public:
    void prepare(double sampleRate, double windowSeconds = 0.1);
    void setPitch(double semitones);
    void reset();
    // In place, on one or two channels
    void process(float* left, float* right, int frames);

private:
    float read(const std::vector<float>& line, double delayFrames) const;

    double sampleRate_ = 44100.0;
    double windowFrames_ = 4410.0;
    double semitones_ = 0.0;
    double phaseStep_ = 0.0;    // sawtooth cycles per frame
    bool rising_ = false;       // delay grows (pitch down) or shrinks (pitch up)
    double phase_ = 0.0;
    std::vector<float> lineL_, lineR_;
    int write_ = 0;
};

} // namespace citizen::dsp
