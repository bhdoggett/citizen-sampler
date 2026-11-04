#include "UiBundle.h"

#include <unordered_map>

namespace citizen {

namespace {
juce::String mimeFor(const juce::String& name) {
    static const std::unordered_map<juce::String, const char*> types{
        {"html", "text/html"},         {"js", "text/javascript"},   {"css", "text/css"},
        {"json", "application/json"},  {"txt", "text/plain"},       {"map", "application/json"},
        {"svg", "image/svg+xml"},      {"png", "image/png"},        {"jpg", "image/jpeg"},
        {"jpeg", "image/jpeg"},        {"ico", "image/x-icon"},     {"webmanifest", "application/manifest+json"},
        {"woff", "font/woff"},         {"woff2", "font/woff2"},     {"wav", "audio/wav"},
        {"mp3", "audio/mpeg"},
    };
    const auto it = types.find(name.fromLastOccurrenceOf(".", false, false).toLowerCase());
    return it != types.end() ? it->second : "application/octet-stream";
}
} // namespace

UiBundle::UiBundle(const void* zipData, size_t size) {
    if (zipData == nullptr || size == 0) return;
    stream_ = std::make_unique<juce::MemoryInputStream>(zipData, size, false);
    zip_ = std::make_unique<juce::ZipFile>(*stream_);
}

std::optional<UiFile> UiBundle::find(const juce::String& path) const {
    if (zip_ == nullptr) return std::nullopt;

    auto name = path.upToFirstOccurrenceOf("?", false, false)
                    .upToFirstOccurrenceOf("#", false, false)
                    .trimCharactersAtStart("/");
    if (name.contains("..")) return std::nullopt;
    if (name.isEmpty()) name = "index.html";

    const auto* entry = zip_->getEntry(name);
    // The export writes each page as name.html
    if (entry == nullptr && !name.fromLastOccurrenceOf("/", false, false).contains("."))
        entry = zip_->getEntry(name + ".html");
    if (entry == nullptr) return std::nullopt;

    std::unique_ptr<juce::InputStream> in(zip_->createStreamForEntry(*entry));
    if (in == nullptr) return std::nullopt;
    juce::MemoryBlock bytes;
    in->readIntoMemoryBlock(bytes);

    UiFile file;
    const auto* begin = static_cast<const std::byte*>(bytes.getData());
    file.data.assign(begin, begin + bytes.getSize());
    file.mimeType = mimeFor(entry->filename);
    return file;
}

} // namespace citizen
