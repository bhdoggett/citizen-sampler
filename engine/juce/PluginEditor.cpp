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

// Files dragged out of the window. The DAW copies them, so they only need
// to outlive the drag.
juce::File dragFolder() {
    return juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("Citizen Sampler");
}

juce::File savedMidiFolder() {
    return juce::File::getSpecialLocation(juce::File::userMusicDirectory)
        .getChildFile("Citizen Sampler")
        .getChildFile("MIDI");
}

void deleteOldDraggedFiles() {
    const auto cutoff = juce::Time::getCurrentTime() - juce::RelativeTime::days(1);
    for (const auto& file : dragFolder().findChildFiles(juce::File::findFiles, false, "*.mid")) {
        if (file.getLastModificationTime() < cutoff) file.deleteFile();
    }
}

// The UI sends file names and standard base64 (btoa), so decode with
// juce::Base64, not MemoryBlock::fromBase64Encoding (a JUCE-only format)
bool writeMidi(const juce::File& file, const juce::String& base64) {
    juce::MemoryOutputStream bytes;
    if (!juce::Base64::convertFromBase64(bytes, base64) || bytes.getDataSize() == 0) return false;
    if (!file.getParentDirectory().createDirectory()) return false;
    return file.replaceWithData(bytes.getData(), bytes.getDataSize());
}

juce::String legalMidiName(const juce::String& requested) {
    auto name = juce::File::createLegalFileName(requested);
    if (name.isEmpty()) name = "citizen-sampler";
    return name.endsWithIgnoreCase(".mid") ? name : name + ".mid";
}
} // namespace

juce::WebBrowserComponent::Options CitizenEditor::browserOptions(CitizenProcessor& owner,
                                                                 CitizenEditor& editor) {
    using Options = juce::WebBrowserComponent::Options;
    return Options{}
        .withBackend(Options::Backend::webview2)
        .withWinWebView2Options(Options::WinWebView2{}.withUserDataFolder(
            // Holds the UI's saved song (localStorage), so not the temp folder.
            // Never rename it: users would lose their saved song.
            juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                .getChildFile("Citizen Sampler")))
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
        })
        // saveMidi(fileName, base64): saves into ~/Music/Citizen Sampler/MIDI
        // under a fresh name and shows it in the Finder. Completes with true
        // once written.
        .withNativeFunction("saveMidi", [](const juce::Array<juce::var>& args, auto complete) {
            if (args.size() < 2) {
                complete(false);
                return;
            }
            auto file = savedMidiFolder().getChildFile(legalMidiName(args[0].toString()));
            if (file.exists()) file = file.getNonexistentSibling();
            const bool written = writeMidi(file, args[1].toString());
            if (written) file.revealToUser();
            complete(written);
        })
        // dragMidi(fileName, base64): starts dragging the file out of the
        // window, for dropping onto a DAW track
        .withNativeFunction("dragMidi", [&editor](const juce::Array<juce::var>& args, auto complete) {
            JUCE_ASSERT_MESSAGE_THREAD
            if (args.size() < 2) {
                complete(false);
                return;
            }
            const auto file = dragFolder().getChildFile(legalMidiName(args[0].toString()));
            const bool started =
                writeMidi(file, args[1].toString()) &&
                juce::DragAndDropContainer::performExternalDragDropOfFiles({file.getFullPathName()}, false, &editor);
            complete(started);
        });
}

CitizenEditor::CitizenEditor(CitizenProcessor& owner)
    : juce::AudioProcessorEditor(owner),
      processor_(owner),
      browser_(browserOptions(owner, *this)) {
    deleteOldDraggedFiles();
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
