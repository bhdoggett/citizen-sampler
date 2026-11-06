#pragma once

#include <juce_gui_extra/juce_gui_extra.h>

#include "PluginProcessor.h"

namespace citizen {

// The web UI in a WebView, wired to the processor: engineCommand events go
// to the engine, engine events come back as engineEvent, and renderStem,
// saveStems, saveMidi and dragMidi are native functions. Event ids match
// frontend-next/src/lib/engine/juce.
class CitizenEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
    explicit CitizenEditor(CitizenProcessor& owner);
    ~CitizenEditor() override;

    void resized() override;

private:
    void timerCallback() override;
    static juce::WebBrowserComponent::Options browserOptions(CitizenProcessor& owner, CitizenEditor& editor);

    CitizenProcessor& processor_;
    juce::WebBrowserComponent browser_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CitizenEditor)
};

} // namespace citizen
