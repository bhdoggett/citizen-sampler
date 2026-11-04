#include <doctest/doctest.h>

#include "../UiBundle.h"

using namespace citizen;

namespace {
// A zip shaped like frontend-next's static export
juce::MemoryBlock exportZip() {
    juce::ZipFile::Builder builder;
    auto add = [&builder](const char* path, const char* text) {
        builder.addEntry(new juce::MemoryInputStream(text, std::strlen(text), true), 0, path,
                         juce::Time());
    };
    add("index.html", "<html>home</html>");
    add("_not-found.html", "<html>missing</html>");
    add("_next/static/chunks/app.js", "console.log(1)");
    add("_next/static/media/font.woff2", "woff");
    add("samples/metronome/hi-block.wav", "RIFF");

    juce::MemoryOutputStream out;
    builder.writeToStream(out, nullptr);
    return out.getMemoryBlock();
}

juce::String text(const UiFile& file) {
    return juce::String(reinterpret_cast<const char*>(file.data.data()), file.data.size());
}
} // namespace

TEST_CASE("the root serves index.html") {
    auto zip = exportZip();
    UiBundle bundle(zip.getData(), zip.getSize());
    auto file = bundle.find("/");
    REQUIRE(file);
    CHECK(text(*file) == "<html>home</html>");
    CHECK(file->mimeType == "text/html");
}

TEST_CASE("files are found by path with query strings and fragments ignored") {
    auto zip = exportZip();
    UiBundle bundle(zip.getData(), zip.getSize());
    auto script = bundle.find("/_next/static/chunks/app.js?v=2");
    REQUIRE(script);
    CHECK(text(*script) == "console.log(1)");
    CHECK(script->mimeType == "text/javascript");
    CHECK(bundle.find("/?loginError=x#top"));
    CHECK(bundle.find("/_next/static/media/font.woff2")->mimeType == "font/woff2");
    CHECK(bundle.find("/samples/metronome/hi-block.wav")->mimeType == "audio/wav");
}

TEST_CASE("a page path without an extension serves its .html file") {
    auto zip = exportZip();
    UiBundle bundle(zip.getData(), zip.getSize());
    auto page = bundle.find("/_not-found");
    REQUIRE(page);
    CHECK(text(*page) == "<html>missing</html>");
}

TEST_CASE("missing files and paths outside the bundle are not found") {
    auto zip = exportZip();
    UiBundle bundle(zip.getData(), zip.getSize());
    CHECK_FALSE(bundle.find("/nope.js"));
    CHECK_FALSE(bundle.find("/../index.html"));
}

TEST_CASE("an empty bundle finds nothing") {
    UiBundle bundle(nullptr, 0);
    CHECK_FALSE(bundle.find("/"));
}
