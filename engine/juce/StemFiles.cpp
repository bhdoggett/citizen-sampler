#include "StemFiles.h"

namespace citizen::stems {

std::vector<Target> targets() {
    std::vector<Target> out;
    out.reserve(static_cast<size_t>(kPadCount * kLoopCount));
    for (int pad = 1; pad <= kPadCount; ++pad) {
        for (int loop = 0; loop < kLoopCount; ++loop) {
            out.push_back({"pad-" + std::to_string(pad), static_cast<Loop>(loop)});
        }
    }
    return out;
}

juce::String fileName(const std::string& padId, Loop loop) {
    static const char* names[] = {"A", "B", "C", "D"};
    return juce::String(padId) + "-loop-" + names[loopIndex(loop)] + ".wav";
}

juce::String songFolderName(const juce::String& songTitle) {
    const auto name = juce::File::createLegalFileName(songTitle).trim();
    return name.isEmpty() ? juce::String("citizen-sampler") : name;
}

juce::File exportFolder(const juce::File& root, const juce::String& songTitle, juce::Time time) {
    // Colons are not allowed in file names, so the time uses dots
    return root.getChildFile(songFolderName(songTitle)).getChildFile(time.formatted("%Y-%m-%d %H.%M.%S"));
}

} // namespace citizen::stems
