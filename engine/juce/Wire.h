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

// Nothing for an unknown or malformed command
std::optional<Command> parseCommand(const juce::var& json);

juce::var toJson(const Event& event);

// { sampleRate, channels: number[][] }
juce::var toJson(const SampleBuffer& stem);

// The plugin state saved with a DAW session: the last setPad command per pad
// (keyed by padId) and the last setLoops command
juce::String sessionStateJson(const juce::DynamicObject& pads, const juce::var& loops);

} // namespace citizen::wire
