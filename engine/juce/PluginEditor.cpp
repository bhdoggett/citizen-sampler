#include "PluginEditor.h"

#if CITIZEN_BUNDLED_UI
#include <UiData.h>
#endif

#include "UiBundle.h"

namespace citizen {

namespace {
const UiBundle& bundledUi() {
#if CITIZEN_BUNDLED_UI
    static const UiBundle bundle(UiData::ui_zip, static_cast<size_t>(UiData::ui_zipSize));
#else
    static const UiBundle bundle(nullptr, 0);
#endif
    return bundle;
}
} // namespace

juce::WebBrowserComponent::Options CitizenEditor::browserOptions(CitizenProcessor& owner) {
    using Options = juce::WebBrowserComponent::Options;
    return Options{}
        .withBackend(Options::Backend::webview2)
        .withWinWebView2Options(Options::WinWebView2{}.withUserDataFolder(
            juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("CitizenSampler")))
        .withNativeIntegrationEnabled()
        .withResourceProvider([](const juce::String& path) -> std::optional<juce::WebBrowserComponent::Resource> {
            auto file = bundledUi().find(path);
            if (!file) return std::nullopt;
            return juce::WebBrowserComponent::Resource{std::move(file->data), file->mimeType};
        })
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withEventListener("engineCommand", [&owner](const juce::var& json) {
            owner.handleCommand(json);
        })
        .withNativeFunction("renderStem", [&owner](const juce::Array<juce::var>& args, auto complete) {
            if (args.size() < 2) {
                complete({});
                return;
            }
            complete(owner.renderStem(args[0].toString(), args[1].toString()));
        });
}

CitizenEditor::CitizenEditor(CitizenProcessor& owner)
    : juce::AudioProcessorEditor(owner),
      processor_(owner),
      browser_(browserOptions(owner)) {
    addAndMakeVisible(browser_);
    const auto url = processor_.uiUrl();
    browser_.goToURL(url ? url->toString(true) : juce::WebBrowserComponent::getResourceProviderRoot());
    setResizable(true, true);
    setResizeLimits(800, 600, 2400, 1600);
    setSize(1280, 820);
    // Engine events reach the UI about 60 times a second
    startTimerHz(60);
}

CitizenEditor::~CitizenEditor() { stopTimer(); }

void CitizenEditor::resized() { browser_.setBounds(getLocalBounds()); }

void CitizenEditor::timerCallback() {
    // A hidden WebView drops events, so leave them queued until it shows
    if (!browser_.isShowing()) return;
    for (const auto& event : processor_.takeEvents()) {
        browser_.emitEventIfBrowserIsVisible("engineEvent", event);
    }
}

} // namespace citizen
