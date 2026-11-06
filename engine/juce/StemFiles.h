#pragma once

#include <juce_core/juce_core.h>

#include <string>
#include <vector>

#include "citizen/Types.h"

// Where stem export writes its WAV files and what it names them. The
// rendering and WAV writing live in the processor; this part needs
// juce_core only, so the wire tests cover it.
namespace citizen::stems {

struct Target {
    std::string padId;
    Loop loop;
};

// Every pad and loop, pad by pad. Pads without a sample, and loops without
// settings or hits, have no stem job and are skipped.
std::vector<Target> targets();

// pad-3-loop-A.wav
juce::String fileName(const std::string& padId, Loop loop);

// The song title as a legal folder name, or citizen-sampler
juce::String songFolderName(const juce::String& songTitle);

// <root>/<song folder>/<yyyy-mm-dd hh.mm.ss>, a fresh folder per export
juce::File exportFolder(const juce::File& root, const juce::String& songTitle, juce::Time time);

} // namespace citizen::stems
