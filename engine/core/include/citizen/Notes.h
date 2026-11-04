#pragma once

#include <optional>
#include <string_view>

namespace citizen {

// MIDI number for a scientific pitch name such as "C4", "F#3" or "Bb-1".
// C4 is 60, the same as Tone.js.
std::optional<int> noteToMidi(std::string_view note);

double midiToFrequency(double midi);

// Every sample is loaded at C4, so a note's playback rate is its frequency
// over C4's. Unparseable notes play at the natural rate.
double playbackRate(std::string_view note);

} // namespace citizen
