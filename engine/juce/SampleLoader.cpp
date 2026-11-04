#include "SampleLoader.h"

namespace citizen {

SampleLoader::SampleLoader(juce::URL baseUrl) : baseUrl_(std::move(baseUrl)) {}

SampleLoader::~SampleLoader() {
    *alive_ = false;
    pool_.removeAllJobs(true, 10000);
}

juce::URL SampleLoader::resolve(const juce::String& url) const {
    // Relative urls are relative to where the UI is served from
    if (url.startsWith("http://") || url.startsWith("https://")) return juce::URL(url);
    return baseUrl_.getChildURL(url.trimCharactersAtStart("/"));
}

std::shared_ptr<const SampleBuffer> SampleLoader::decode(const void* data, size_t size,
                                                         juce::String& error) {
    juce::AudioFormatManager formats;
    formats.registerBasicFormats();
    auto reader = std::unique_ptr<juce::AudioFormatReader>(formats.createReaderFor(
        std::make_unique<juce::MemoryInputStream>(data, size, false)));
    if (!reader) {
        error = "Unsupported or unreadable audio";
        return nullptr;
    }

    const int frames = static_cast<int>(reader->lengthInSamples);
    const int channels = static_cast<int>(juce::jmin(2u, reader->numChannels));
    juce::AudioBuffer<float> audio(channels, frames);
    reader->read(&audio, 0, frames, 0, true, channels > 1);

    auto buffer = std::make_shared<SampleBuffer>();
    buffer->sampleRate = reader->sampleRate;
    buffer->channels.resize(static_cast<size_t>(channels));
    for (int c = 0; c < channels; ++c) {
        buffer->channels[static_cast<size_t>(c)].assign(audio.getReadPointer(c),
                                                        audio.getReadPointer(c) + frames);
    }
    return buffer;
}

void SampleLoader::load(const juce::String& url, Done done) {
    {
        std::lock_guard lock(cacheLock_);
        if (auto it = cache_.find(url); it != cache_.end()) {
            done(it->second, {});
            return;
        }
    }

    const juce::URL resolved = resolve(url);
    pool_.addJob([this, url, resolved, onDone = std::move(done), alive = alive_] {
        juce::String error;
        std::shared_ptr<const SampleBuffer> buffer;

        juce::MemoryBlock bytes;
        auto stream = resolved.createInputStream(
            juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
                .withConnectionTimeoutMs(15000)
                .withNumRedirectsToFollow(5));
        if (!stream) {
            error = "Could not fetch " + url;
        } else {
            stream->readIntoMemoryBlock(bytes);
            buffer = decode(bytes.getData(), bytes.getSize(), error);
        }

        juce::MessageManager::callAsync([this, url, buffer, error, onDone, alive] {
            if (!*alive) return;
            if (buffer) {
                std::lock_guard lock(cacheLock_);
                cache_[url] = buffer;
            }
            onDone(buffer, error);
        });
    });
}

} // namespace citizen
