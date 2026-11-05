#include <doctest/doctest.h>

#include "citizen/Notes.h"

using namespace citizen;

TEST_CASE("noteToMidi reads scientific pitch names") {
    CHECK(noteToMidi("C4") == 60);
    CHECK(noteToMidi("A4") == 69);
    CHECK(noteToMidi("C#4") == 61);
    CHECK(noteToMidi("Db4") == 61);
    CHECK(noteToMidi("B3") == 59);
    CHECK(noteToMidi("C-1") == 0);
    CHECK(noteToMidi("c4") == 60);
    CHECK(noteToMidi("Cx4") == 62);
    CHECK(noteToMidi("Ebb4") == 62);
}

TEST_CASE("noteToMidi rejects anything else") {
    CHECK_FALSE(noteToMidi("").has_value());
    CHECK_FALSE(noteToMidi("H4").has_value());
    CHECK_FALSE(noteToMidi("C").has_value());
    CHECK_FALSE(noteToMidi("C4x").has_value());
}

TEST_CASE("playbackRate is relative to C4") {
    CHECK(playbackRate("C4") == doctest::Approx(1.0));
    CHECK(playbackRate("C5") == doctest::Approx(2.0));
    CHECK(playbackRate("C3") == doctest::Approx(0.5));
    CHECK(playbackRate("G4") == doctest::Approx(1.4983).epsilon(0.001));
    CHECK(playbackRate("nonsense") == doctest::Approx(1.0));
}

TEST_CASE("midiToFrequency puts A4 at 440 Hz") {
    CHECK(midiToFrequency(69) == doctest::Approx(440.0));
}

TEST_CASE("midiToNote spells notes like Tone") {
    CHECK(midiToNote(60) == "C4");
    CHECK(midiToNote(61) == "C#4");
    CHECK(midiToNote(24) == "C1");
    CHECK(midiToNote(0) == "C-1");
    CHECK(noteToMidi(midiToNote(127)) == 127);
}
