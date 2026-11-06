#pragma once

#include <optional>
#include <string>
#include <string_view>

namespace citizen {

// MIDI number for a scientific pitch name such as "C4", "F#3" or "Bb-1".
// C4 is 60, the same as Tone.js.
std::optional<int> noteToMidi(std::string_view note);

// The note name for a MIDI number, spelled with sharps like Tone.js:
// 60 is "C4", 61 is "C#4", 0 is "C-1".
std::string midiToNote(int midi);

double midiToFrequency(double midi);

// Every sample is loaded at C4, so a note's playback rate is its frequency
// over C4's. Unparseable notes play at the natural rate.
double playbackRate(std::string_view note);

} // namespace citizen
