#pragma once

#include <juce_core/juce_core.h>

#include <optional>

#include "citizen/Engine.h"
#include "citizen/Protocol.h"

// Converts between the engine protocol and the JSON values the WebView
// sends and receives. The shapes match
// frontend-next/src/lib/engine/protocol.ts.
namespace citizen::wire {

std::optional<Loop> parseLoop(const juce::String& name);
juce::String loopName(Loop loop);
// "kit" or "multiOut"
std::optional<PadLayout> parseLayout(const juce::String& name);
juce::String layoutName(PadLayout layout);

// Nothing for an unknown or malformed command
std::optional<Command> parseCommand(const juce::var& json);

juce::var toJson(const Event& event);

// { sampleRate, channels: number[][] }
juce::var toJson(const SampleBuffer& stem);

// The plugin state saved with a DAW session: the last setPad command per pad
// (keyed by padId), the last setLoops command and the pad layout
juce::String sessionStateJson(const juce::DynamicObject& pads, const juce::var& loops, PadLayout layout);
// The saved layout; kit for sessions saved without one or with an unknown one
PadLayout sessionLayout(const juce::var& state);

} // namespace citizen::wire
