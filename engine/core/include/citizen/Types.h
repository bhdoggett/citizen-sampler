#pragma once

#include <array>
#include <optional>
#include <string>
#include <vector>

// The song document as the engine sees it. Mirrors the TypeScript types in
// frontend-next/src/types/audioTypes.ts and uses the same units:
// event start times in ticks (192 per quarter note), durations in seconds.
namespace citizen {

enum class Loop { A = 0, B = 1, C = 2, D = 3 };
inline constexpr int kLoopCount = 4;

inline int loopIndex(Loop loop) { return static_cast<int>(loop); }

struct LoopTiming {
    double bpm = 120.0;
    int beats = 4;
    int bars = 2;
};

struct LoopSettings {
    LoopTiming timing;
    // 0 to 1. Delays off-beat eighth notes, the same as Tone.js swing.
    double swing = 0.0;
    bool isInitialized = false;
};

using AllLoopSettings = std::array<std::optional<LoopSettings>, kLoopCount>;

struct SampleEvent {
    std::optional<double> startTicks;
    std::optional<double> duration; // seconds
    std::string note = "C4";        // trigger note, already transposed
    double velocity = 1.0;
};

struct SampleSettings {
    bool mute = false;
    bool solo = false;
    bool reverse = false;
    bool oneShot = false;
    bool quantize = false;
    std::string quantVal = "4";
    double start = 0.0;              // seconds into the buffer
    std::optional<double> end;       // seconds; unset or 0 means the buffer end
    double volume = 0.0;             // dB
    double pan = 0.0;                // -1 to 1
    double pitch = 0.0;              // semitones, time-preserving shift
    double attack = 0.0;             // seconds
    double release = 0.0;            // seconds
    double highpass = 0.0;           // Hz
    double lowpass = 20000.0;        // Hz
    std::string baseNote = "C4";     // the note the sample sounds at unpitched
};

struct PadState {
    std::string url;
    SampleSettings settings;
    std::array<std::vector<SampleEvent>, kLoopCount> events;
};

// Decoded audio. The host decodes files; the core never touches them.
struct SampleBuffer {
    double sampleRate = 44100.0;
    std::vector<std::vector<float>> channels;

    int numFrames() const {
        return channels.empty() ? 0 : static_cast<int>(channels[0].size());
    }
    double duration() const { return sampleRate > 0 ? numFrames() / sampleRate : 0.0; }
};

} // namespace citizen
