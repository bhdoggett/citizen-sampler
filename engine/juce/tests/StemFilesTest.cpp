#include <doctest/doctest.h>

#include "../StemFiles.h"

using namespace citizen;

TEST_CASE("stem export covers every pad and loop, pad by pad") {
    const auto targets = stems::targets();
    REQUIRE(targets.size() == static_cast<size_t>(kPadCount * kLoopCount));
    CHECK(targets.front().padId == "pad-1");
    CHECK(targets.front().loop == Loop::A);
    CHECK(targets[1].padId == "pad-1");
    CHECK(targets[1].loop == Loop::B);
    CHECK(targets[4].padId == "pad-2");
    CHECK(targets.back().padId == "pad-16");
    CHECK(targets.back().loop == Loop::D);
}

TEST_CASE("stem files are named by pad number and loop") {
    CHECK(stems::fileName("pad-3", Loop::A) == "pad-3-loop-A.wav");
    CHECK(stems::fileName("pad-16", Loop::D) == "pad-16-loop-D.wav");
}

TEST_CASE("the song folder is the legal song title, or citizen-sampler") {
    CHECK(stems::songFolderName("My Song") == "My Song");
    CHECK(stems::songFolderName("AC/DC: Live?") == "ACDC Live");
    CHECK(stems::songFolderName("") == "citizen-sampler");
    CHECK(stems::songFolderName("   ") == "citizen-sampler");
    CHECK(stems::songFolderName("///") == "citizen-sampler");
}

TEST_CASE("each export goes in its own timestamped folder under the song") {
    const juce::File root = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("Stems");
    const juce::Time time(2026, 10, 5, 15, 28, 49); // months count from 0
    const auto folder = stems::exportFolder(root, "My Song", time);
    CHECK(folder.getParentDirectory() == root.getChildFile("My Song"));
    CHECK(folder.getFileName() == "2026-11-05 15.28.49");
}
