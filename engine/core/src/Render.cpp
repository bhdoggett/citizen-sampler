#include <algorithm>
#include <cmath>

#include "citizen/Engine.h"
#include "citizen/Notes.h"
#include "citizen/Rules.h"

namespace citizen {

// Offline: a fresh channel with the pad's sample and settings plays the
// loop's hits once, with that loop's own tempo and swing. Muted pads render
// silent stems, as in the live mix.
std::optional<SampleBuffer> Engine::renderStem(const std::string& padId, Loop loop,
                                               double sampleRate) const {
    auto it = pads_.find(padId);
    const auto& loopSettings = loops_[loopIndex(loop)];
    if (it == pads_.end() || !loopSettings || !it->second->buffer) return std::nullopt;
    const Pad& pad = *it->second;
    if (pad.state.events[loopIndex(loop)].empty()) return std::nullopt;

    const LoopTiming& t = loopSettings->timing;
    const auto hits = buildSchedule(pad.state, loop, t);
    const double seconds = calcRenderDuration(hits, loopDurationSeconds(t));
    const int totalFrames = static_cast<int>(std::ceil(seconds * sampleRate));

    constexpr int kBlock = 512;
    PadChannel channel;
    channel.prepare(sampleRate, kBlock);
    channel.setBuffer(pad.buffer);
    channel.setSettings(pad.state.settings);
    const bool solosExist = std::any_of(pads_.begin(), pads_.end(), [](const auto& entry) {
        return entry.second->state.settings.solo;
    });
    const auto& s = pad.state.settings;
    channel.setMuteGain(computeGain(s.mute, s.solo, solosExist));

    struct Start {
        int frame;
        const ScheduledHit* hit;
    };
    std::vector<Start> starts;
    for (const auto& hit : hits) {
        if (!hit.duration) continue;
        const double time =
            hit.time + swingOffsetSeconds(secondsToTicks(hit.time, t.bpm), loopSettings->swing, t.bpm);
        starts.push_back({static_cast<int>(std::floor(time * sampleRate)), &hit});
    }
    std::sort(starts.begin(), starts.end(), [](const Start& a, const Start& b) { return a.frame < b.frame; });

    SampleBuffer out;
    out.sampleRate = sampleRate;
    out.channels.assign(2, std::vector<float>(totalFrames, 0.0f));
    const double bufferDuration = pad.buffer->duration();

    size_t next = 0;
    for (int done = 0; done < totalFrames; done += kBlock) {
        const int n = std::min(kBlock, totalFrames - done);
        for (; next < starts.size() && starts[next].frame < done + n; ++next) {
            const ScheduledHit& hit = *starts[next].hit;
            const int delay = std::max(0, starts[next].frame - done);
            const double rate = playbackRate(hit.note);
            const auto params = calcTriggerParams(s, rate, *hit.duration, bufferDuration);
            const int note = noteToMidi(hit.note).value_or(60);
            channel.startNote(note, rate, static_cast<float>(hit.velocity), params.offset, delay);
            channel.releaseNote(note, delay + static_cast<int>(std::lround(params.duration * sampleRate)));
        }
        channel.process(out.channels[0].data() + done, out.channels[1].data() + done, n);
    }
    return out;
}

} // namespace citizen
