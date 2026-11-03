#pragma once

#include <array>
#include <memory>
#include <vector>

#include "citizen/Types.h"
#include "citizen/Voice.h"
#include "citizen/dsp/Biquad.h"
#include "citizen/dsp/PitchShifter.h"

namespace citizen {

// One pad's voices and FX chain, in Tone's order: mute/solo gain, pitch
// shift, high-pass, low-pass, then pan and volume.
class PadChannel {
public:
    static constexpr int kMaxVoices = 16;

    void prepare(double sampleRate, int maxBlockFrames);
    void setBuffer(std::shared_ptr<const SampleBuffer> buffer);
    void setSettings(const SampleSettings& settings);
    void setMuteGain(float gain) { muteGain_ = gain; }

    bool hasBuffer() const { return buffer_ != nullptr; }
    double bufferDuration() const { return buffer_ ? buffer_->duration() : 0.0; }

    // Start a note `delayFrames` into the next block. Settings decide the
    // offset, reverse, attack and release.
    void startNote(int note, double rate, float velocity, double offsetSeconds, int delayFrames);
    // Release every voice of this note `delayFrames` into the next block
    void releaseNote(int note, int delayFrames);
    void releaseAll();

    // Adds this pad's output into left and right
    void process(float* left, float* right, int frames);

private:
    std::shared_ptr<const SampleBuffer> buffer_;
    std::shared_ptr<const SampleBuffer> reversed_;
    SampleSettings settings_;
    double sampleRate_ = 44100.0;
    float muteGain_ = 1.0f;
    std::array<Voice, kMaxVoices> voices_;
    std::vector<float> busL_, busR_;
    dsp::PitchShifter pitch_;
    std::array<dsp::Biquad, 2> highpass_, lowpass_;
    bool highpassOn_ = false, lowpassOn_ = false;
};

} // namespace citizen
