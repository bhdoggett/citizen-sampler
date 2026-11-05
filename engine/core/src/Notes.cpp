#include "citizen/Notes.h"

#include <cctype>
#include <cmath>
#include <string>

namespace citizen {

std::optional<int> noteToMidi(std::string_view note) {
    if (note.empty()) return std::nullopt;

    static constexpr int kLetterSemitones[] = {9, 11, 0, 2, 4, 5, 7}; // A..G
    const char letter = static_cast<char>(std::toupper(static_cast<unsigned char>(note[0])));
    if (letter < 'A' || letter > 'G') return std::nullopt;
    int semitone = kLetterSemitones[letter - 'A'];

    size_t i = 1;
    for (; i < note.size(); ++i) {
        const char c = note[i];
        if (c == '#') semitone += 1;
        else if (c == 'x') semitone += 2;
        else if (c == 'b') semitone -= 1;
        else break;
    }

    // The octave: an optional minus sign, then digits to the end
    std::string_view octaveText = note.substr(i);
    if (octaveText.empty()) return std::nullopt;
    size_t j = octaveText[0] == '-' ? 1 : 0;
    if (j == octaveText.size()) return std::nullopt;
    for (size_t k = j; k < octaveText.size(); ++k) {
        if (!std::isdigit(static_cast<unsigned char>(octaveText[k]))) return std::nullopt;
    }
    const int octave = std::stoi(std::string(octaveText));
    return (octave + 1) * 12 + semitone;
}

std::string midiToNote(int midi) {
    static constexpr const char* kNames[] = {"C", "C#", "D", "D#", "E", "F",
                                             "F#", "G", "G#", "A", "A#", "B"};
    const int octave = (midi >= 0 ? midi / 12 : -((11 - midi) / 12)) - 1;
    const int semitone = ((midi % 12) + 12) % 12;
    return std::string(kNames[semitone]) + std::to_string(octave);
}

double midiToFrequency(double midi) { return 440.0 * std::pow(2.0, (midi - 69.0) / 12.0); }

double playbackRate(std::string_view note) {
    const auto midi = noteToMidi(note);
    if (!midi) return 1.0;
    return std::pow(2.0, (*midi - 60) / 12.0);
}

} // namespace citizen
