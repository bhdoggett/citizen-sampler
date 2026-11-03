#pragma once

#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_events/juce_events.h>

#include <functional>
#include <map>
#include <memory>
#include <mutex>

#include "citizen/Types.h"

namespace citizen {

// Fetches and decodes sample audio off the message thread. Results are
// cached by url, so pads sharing a sample, or a song loaded twice, fetch once.
class SampleLoader {
public:
    using Done = std::function<void(std::shared_ptr<const SampleBuffer> buffer, juce::String error)>;

    explicit SampleLoader(juce::URL baseUrl);
    ~SampleLoader();

    // `done` runs on the message thread
    void load(const juce::String& url, Done done);

    // Decode audio already in memory
    static std::shared_ptr<const SampleBuffer> decode(const void* data, size_t size,
                                                      juce::String& error);

private:
    juce::URL resolve(const juce::String& url) const;

    juce::URL baseUrl_;
    juce::ThreadPool pool_{2};
    std::mutex cacheLock_;
    std::map<juce::String, std::shared_ptr<const SampleBuffer>> cache_;
    std::shared_ptr<bool> alive_ = std::make_shared<bool>(true);
};

} // namespace citizen
