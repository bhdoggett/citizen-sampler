#pragma once

#include "citizen/Types.h"

namespace citizen {

// One playing note of a sample: reads the buffer from an offset at a rate,
// with a linear fade in (attack) and fade out (release), like Tone's
// ToneBufferSource. Renders by adding into the output.
class Voice {
public:
    struct Start {
        const SampleBuffer* buffer = nullptr;
        double offsetSeconds = 0.0;
        double rate = 1.0;           // playback rate from the note
        float velocity = 1.0f;
        double attackSeconds = 0.0;
        double releaseSeconds = 0.0;
        int delayFrames = 0;         // frames into the next block before it starts
        int note = -1;               // MIDI number, to match releases
    };

    void start(const Start& params, double outputSampleRate);
    // Begin the release this many frames from now
    void releaseAfter(int frames);
    void kill() { active_ = false; }

    bool active() const { return active_; }
    int note() const { return note_; }
    long long age() const { return age_; }

    void render(float* left, float* right, int frames);

private:
    const SampleBuffer* buffer_ = nullptr;
    bool active_ = false;
    int note_ = -1;
    double position_ = 0.0;      // in buffer frames
    double step_ = 1.0;          // buffer frames per output frame
    float velocity_ = 1.0f;
    int delay_ = 0;
    int attackFrames_ = 0;
    int releaseFrames_ = 0;
    long long played_ = 0;       // output frames since the start
    long long releaseAt_ = -1;   // output frame where the fade out begins
    long long age_ = 0;
};

} // namespace citizen
