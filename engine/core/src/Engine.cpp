#include "citizen/Engine.h"

#include <algorithm>
#include <cmath>

#include "citizen/Notes.h"
#include "citizen/Rules.h"

namespace citizen {

namespace {
constexpr int kMetronomeVoices = 4;

int midiOf(const std::string& note) { return noteToMidi(note).value_or(60); }

template <class... Ts>
struct Overloaded : Ts... {
    using Ts::operator()...;
};
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;
} // namespace

Engine::Engine() : clicks_(kMetronomeVoices) {
    LiveInput::Deps deps;
    deps.attack = [this](const std::string& padId, const std::string& note, double velocity) {
        return attack(padId, note, velocity);
    };
    deps.releaseVoice = [this](const std::string& padId, const std::string& note) {
        if (auto it = pads_.find(padId); it != pads_.end()) {
            it->second->channel.releaseNote(midiOf(note), 0);
        }
    };
    deps.padSettings = [this](const std::string& padId) {
        auto it = pads_.find(padId);
        return it != pads_.end() ? it->second->state.settings : SampleSettings{};
    };
    deps.recordingPosition = [this]() -> std::optional<LiveInput::Position> {
        const auto t = timing(currentLoop_);
        if (!playing_ || !recording_ || !t) return std::nullopt;
        return LiveInput::Position{currentLoop_, secondsToTicks(position_, t->bpm)};
    };
    deps.isRecording = [this] { return playing_ && recording_; };
    deps.transportSeconds = [this] { return position_; };
    deps.loopTiming = [this](Loop loop) { return timing(loop); };
    deps.emit = [this](Event event) { events_.push_back(std::move(event)); };
    deps.setTimer = [this](double seconds, std::function<void()> fn) {
        const int id = nextTimer_++;
        timers_.push_back({nowSeconds() + seconds, id, std::move(fn)});
        return id;
    };
    deps.cancelTimer = [this](int id) {
        std::erase_if(timers_, [id](const Timer& t) { return t.id == id; });
    };
    live_ = std::make_unique<LiveInput>(std::move(deps));
}

Engine::~Engine() = default;

void Engine::prepare(double sampleRate, int maxBlockFrames) {
    sampleRate_ = sampleRate;
    maxBlockFrames_ = std::max(1, maxBlockFrames);
    mixL_.assign(maxBlockFrames_, 0.0f);
    mixR_.assign(maxBlockFrames_, 0.0f);
    for (auto& [id, pad] : pads_) {
        pad->channel.prepare(sampleRate_, maxBlockFrames_);
        pad->channel.setSettings(pad->state.settings);
    }
}

std::optional<LoopTiming> Engine::timing(Loop loop) const {
    const auto& settings = loops_[loopIndex(loop)];
    if (!settings) return std::nullopt;
    return settings->timing;
}

double Engine::swing() const {
    const auto& settings = loops_[loopIndex(currentLoop_)];
    return settings ? settings->swing : 0.0;
}

// ---- Commands ----

void Engine::handle(const Command& command) {
    std::visit(
        Overloaded{
            [this](const cmd::SetPad& c) { setPad(c.padId, c.pad); },
            [this](const cmd::RemovePad& c) {
                pads_.erase(c.padId);
                applyGains();
            },
            [this](const cmd::SetLoops& c) { setLoops(c.loops); },
            [this](const cmd::SetCurrentLoop& c) { setCurrentLoop(c.loop); },
            [this](const cmd::Play&) { play(); },
            [this](const cmd::Stop&) { stop(); },
            [this](const cmd::SetRecording& c) {
                recording_ = c.on;
                emitTransport();
            },
            [this](const cmd::SetMetronome& c) { metronomeOn_ = c.on; },
            [this](const cmd::Press& c) { live_->press(c.padId, c.note, c.velocity); },
            [this](const cmd::Release& c) { live_->release(c.padId, c.note); },
            // The tuner has no native pitch detection yet
            [](const cmd::SetTunerPad&) {},
            [this](const cmd::PreviewSample& c) {
                if (previewUrl_) events_.push_back(evt::PreviewEnded{*previewUrl_});
                preview_.kill();
                previewBuffer_.reset();
                previewUrl_ = c.url;
            },
            [this](const cmd::StopPreview&) {
                if (!previewUrl_) return;
                preview_.kill();
                previewBuffer_.reset();
                events_.push_back(evt::PreviewEnded{*previewUrl_});
                previewUrl_.reset();
            },
        },
        command);
}

void Engine::setPad(const std::string& padId, const PadState& state) {
    auto& slot = pads_[padId];
    if (!slot) {
        slot = std::make_unique<Pad>();
        slot->channel.prepare(sampleRate_, maxBlockFrames_);
    }
    Pad& pad = *slot;
    const bool urlChanged = pad.state.url != state.url;
    pad.state = state;
    pad.channel.setSettings(state.settings);
    if (urlChanged && pad.bufferUrl != state.url) {
        // Silent until the host loads the new sample
        pad.buffer.reset();
        pad.bufferUrl.clear();
        pad.channel.setBuffer(nullptr);
    }
    if (const auto t = timing(currentLoop_)) {
        pad.schedule = buildSchedule(pad.state, currentLoop_, *t);
    }
    applyGains();
}

void Engine::setPadBuffer(const std::string& padId, const std::string& url,
                          std::shared_ptr<const SampleBuffer> buffer) {
    auto it = pads_.find(padId);
    if (it == pads_.end() || it->second->state.url != url || !buffer) return;
    Pad& pad = *it->second;
    pad.buffer = buffer;
    pad.bufferUrl = url;
    pad.channel.setBuffer(std::move(buffer));
    events_.push_back(evt::PadLoaded{padId, pad.buffer->duration()});
}

void Engine::setPadLoadFailed(const std::string& padId, const std::string& url,
                              const std::string& message) {
    auto it = pads_.find(padId);
    if (it == pads_.end() || it->second->state.url != url) return;
    events_.push_back(evt::PadLoadFailed{padId, message});
}

std::vector<std::pair<std::string, std::string>> Engine::padsNeedingAudio() const {
    std::vector<std::pair<std::string, std::string>> out;
    for (const auto& [id, pad] : pads_) {
        if (!pad->state.url.empty() && pad->bufferUrl != pad->state.url) {
            out.emplace_back(id, pad->state.url);
        }
    }
    return out;
}

void Engine::setMetronomeBuffers(std::shared_ptr<const SampleBuffer> high,
                                 std::shared_ptr<const SampleBuffer> low) {
    for (auto& v : clicks_) v.kill();
    clickHigh_ = std::move(high);
    clickLow_ = std::move(low);
}

void Engine::setPreviewBuffer(const std::string& url, std::shared_ptr<const SampleBuffer> buffer) {
    if (previewUrl_ != url || !buffer) return;
    previewBuffer_ = std::move(buffer);
    Voice::Start start;
    start.buffer = previewBuffer_.get();
    preview_.start(start, sampleRate_);
    events_.push_back(evt::PreviewStarted{url, previewBuffer_->duration()});
}

// Mute and solo depend on every pad, so any pad's change can move them all
void Engine::applyGains() {
    const bool solosExist = std::any_of(pads_.begin(), pads_.end(), [](const auto& entry) {
        return entry.second->state.settings.solo;
    });
    for (auto& [id, pad] : pads_) {
        const auto& s = pad->state.settings;
        pad->channel.setMuteGain(computeGain(s.mute, s.solo, solosExist));
    }
}

void Engine::rebuildSchedules() {
    const auto t = timing(currentLoop_);
    for (auto& [id, pad] : pads_) {
        pad->schedule = t ? buildSchedule(pad->state, currentLoop_, *t) : std::vector<ScheduledHit>{};
    }
}

void Engine::setLoops(const AllLoopSettings& loops) {
    loops_ = loops;
    rebuildSchedules();
    if (const auto t = timing(currentLoop_)) {
        position_ = std::fmod(position_, loopDurationSeconds(*t));
    }
    emitTransport();
}

void Engine::setCurrentLoop(Loop loop) {
    if (loop == currentLoop_) return;
    currentLoop_ = loop;
    // Restart from the top when switching loops
    position_ = 0.0;
    rebuildSchedules();
    emitTransport();
}

void Engine::play() {
    if (playing_) return;
    playing_ = true;
    emitTransport();
}

void Engine::stop() {
    if (!playing_) return;
    playing_ = false;
    recording_ = false;
    position_ = 0.0;
    emitTransport();
}

void Engine::emitTransport() {
    const auto t = timing(currentLoop_);
    events_.push_back(evt::Transport{playing_, recording_, currentLoop_, position_,
                                     t ? loopDurationSeconds(*t) : 0.0});
}

void Engine::emitAt(long long frame, Event event) {
    due_.push_back({frame, std::move(event)});
}

// ---- Playing ----

std::optional<double> Engine::attack(const std::string& padId, const std::string& note,
                                     double velocity) {
    auto it = pads_.find(padId);
    if (it == pads_.end() || !it->second->buffer) return std::nullopt;
    Pad& pad = *it->second;
    const auto& s = pad.state.settings;
    const double bufferDuration = pad.buffer->duration();
    const double rate = playbackRate(note);
    const double offset = s.reverse ? bufferDuration - s.end.value_or(bufferDuration) : s.start;
    pad.channel.startNote(midiOf(note), rate, static_cast<float>(velocity), offset, 0);
    return calcReleaseDelay(s.start, s.end, bufferDuration, rate);
}

void Engine::triggerScheduled(Pad& pad, const std::string& padId, const ScheduledHit& hit,
                              int delayFrames) {
    if (!pad.buffer || !hit.duration) return;
    const double rate = playbackRate(hit.note);
    const auto params =
        calcTriggerParams(pad.state.settings, rate, *hit.duration, pad.buffer->duration());
    const int note = midiOf(hit.note);
    pad.channel.startNote(note, rate, static_cast<float>(hit.velocity), params.offset, delayFrames);
    const int durationFrames = static_cast<int>(std::lround(params.duration * sampleRate_));
    pad.channel.releaseNote(note, delayFrames + durationFrames);
    emitAt(frameClock_ + delayFrames, evt::VoiceStarted{padId, hit.note});
    emitAt(frameClock_ + delayFrames + durationFrames, evt::VoiceEnded{padId, hit.note});
}

// Start everything scheduled in [from, to) seconds of the loop, `blockOffset`
// frames into the current block
void Engine::runSegment(double from, double to, int blockOffset) {
    const auto t = timing(currentLoop_);
    if (!t) return;
    const double loopLength = loopDurationSeconds(*t);
    const double swingAmount = swing();
    auto framesInto = [&](double time) {
        return blockOffset + static_cast<int>(std::floor((time - from) * sampleRate_));
    };

    for (auto& [id, pad] : pads_) {
        for (const auto& hit : pad->schedule) {
            double time =
                hit.time + swingOffsetSeconds(secondsToTicks(hit.time, t->bpm), swingAmount, t->bpm);
            if (time >= loopLength) time -= loopLength;
            if (time >= from && time < to) triggerScheduled(*pad, id, hit, framesInto(time));
        }
    }

    if (metronomeOn_ && clickHigh_ && clickLow_) {
        const double beat = 60.0 / t->bpm;
        for (double k = std::ceil(from / beat - 1e-9); k * beat < to; k += 1.0) {
            const bool downbeat = static_cast<long long>(k) % t->beats == 0;
            auto voice = std::find_if(clicks_.begin(), clicks_.end(),
                                      [](const Voice& v) { return !v.active(); });
            if (voice == clicks_.end()) voice = clicks_.begin();
            Voice::Start start;
            start.buffer = downbeat ? clickHigh_.get() : clickLow_.get();
            start.delayFrames = framesInto(k * beat);
            voice->start(start, sampleRate_);
        }
    }
}

void Engine::fireTimers() {
    const double now = nowSeconds();
    // Timers can add or cancel timers, so take the due ones out first
    std::vector<Timer> ready;
    for (auto it = timers_.begin(); it != timers_.end();) {
        if (it->at <= now) {
            ready.push_back(std::move(*it));
            it = timers_.erase(it);
        } else {
            ++it;
        }
    }
    std::sort(ready.begin(), ready.end(), [](const Timer& a, const Timer& b) { return a.at < b.at; });
    for (auto& timer : ready) timer.fn();
}

void Engine::process(float* const* out, int numChannels, int numFrames) {
    int done = 0;
    while (done < numFrames) {
        const int n = std::min(maxBlockFrames_, numFrames - done);
        fireTimers();

        const auto t = timing(currentLoop_);
        if (playing_ && t) {
            const double loopLength = loopDurationSeconds(*t);
            double from = position_;
            int offset = 0;
            int remaining = n;
            while (remaining > 0) {
                const double to = std::min(from + remaining / sampleRate_, loopLength);
                const int frames =
                    std::min(remaining, std::max(1, static_cast<int>(std::lround((to - from) * sampleRate_))));
                runSegment(from, to, offset);
                offset += frames;
                remaining -= frames;
                if (to >= loopLength - 1e-12) {
                    from = 0.0;
                    // Re-anchor the UI's playheads at the top of every loop
                    emitAt(frameClock_ + offset,
                           evt::Transport{true, recording_, currentLoop_, 0.0, loopLength});
                } else {
                    from = to;
                }
            }
            position_ = from;
        }

        std::fill_n(mixL_.begin(), n, 0.0f);
        std::fill_n(mixR_.begin(), n, 0.0f);
        for (auto& [id, pad] : pads_) pad->channel.process(mixL_.data(), mixR_.data(), n);
        for (auto& click : clicks_) click.render(mixL_.data(), mixR_.data(), n);
        if (preview_.active()) {
            preview_.render(mixL_.data(), mixR_.data(), n);
            if (!preview_.active() && previewUrl_) {
                events_.push_back(evt::PreviewEnded{*previewUrl_});
                previewUrl_.reset();
                previewBuffer_.reset();
            }
        }

        for (int ch = 0; ch < numChannels; ++ch) {
            float* dest = out[ch] + done;
            if (numChannels == 1) {
                for (int i = 0; i < n; ++i) dest[i] = 0.5f * (mixL_[i] + mixR_[i]);
            } else if (ch == 0) {
                std::copy_n(mixL_.begin(), n, dest);
            } else if (ch == 1) {
                std::copy_n(mixR_.begin(), n, dest);
            } else {
                std::fill_n(dest, n, 0.0f);
            }
        }

        frameClock_ += n;
        done += n;

        // Hand over events whose moment has now been played
        std::stable_sort(due_.begin(), due_.end(),
                         [](const Due& a, const Due& b) { return a.frame < b.frame; });
        auto firstLater = std::find_if(due_.begin(), due_.end(),
                                       [this](const Due& d) { return d.frame >= frameClock_; });
        for (auto it = due_.begin(); it != firstLater; ++it) events_.push_back(std::move(it->event));
        due_.erase(due_.begin(), firstLater);
    }
}

std::vector<Event> Engine::takeEvents() {
    std::vector<Event> out;
    out.swap(events_);
    return out;
}

} // namespace citizen
