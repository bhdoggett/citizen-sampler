#pragma once

#include <juce_core/juce_core.h>

#include <cstddef>
#include <memory>
#include <optional>
#include <vector>

namespace citizen {

struct UiFile {
    std::vector<std::byte> data;
    juce::String mimeType;
};

// The web UI's static export, zipped into the binary, served to the WebView
// by path. Paths are what the WebView asks for: "/", "/_next/...", maybe
// with a query string.
class UiBundle {
public:
    // The zip data must outlive the bundle
    UiBundle(const void* zipData, size_t size);

    std::optional<UiFile> find(const juce::String& path) const;

private:
    std::unique_ptr<juce::MemoryInputStream> stream_;
    std::unique_ptr<juce::ZipFile> zip_;
};

} // namespace citizen
