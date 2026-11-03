#include "citizen/LiveInput.h"

#include "citizen/Rules.h"

namespace citizen {

namespace {
std::string keyOf(const std::string& padId, const std::string& note) { return padId + "|" + note; }
} // namespace

void LiveInput::endVoice(Held& entry) {
    if (entry.timer) deps_.cancelTimer(*entry.timer);
    entry.timer.reset();
    entry.audioReleased = true;
    deps_.releaseVoice(entry.padId, entry.note);
    deps_.emit(evt::VoiceEnded{entry.padId, entry.note});
}

void LiveInput::press(const std::string& padId, const std::string& note, double velocity) {
    const std::string key = keyOf(padId, note);
    if (auto it = notes_.find(key); it != notes_.end() && it->second.timer) {
        deps_.cancelTimer(*it->second.timer);
    }

    const auto soundSeconds = deps_.attack(padId, note, velocity);
    if (!soundSeconds) {
        notes_.erase(key);
        return;
    }

    Held entry;
    entry.padId = padId;
    entry.note = note;
    if (const auto position = deps_.recordingPosition()) {
        entry.pending = Pending{position->loop, position->ticks, deps_.transportSeconds(), velocity};
    }
    entry.timer = deps_.setTimer(*soundSeconds, [this, key] {
        auto it = notes_.find(key);
        if (it == notes_.end()) return;
        Held& e = it->second;
        e.timer.reset();
        if (e.audioReleased) return;
        endVoice(e);
        if (!e.held) notes_.erase(it);
    });
    notes_.insert_or_assign(key, std::move(entry));
    deps_.emit(evt::VoiceStarted{padId, note});
}

void LiveInput::release(const std::string& padId, const std::string& note) {
    const std::string key = keyOf(padId, note);
    auto it = notes_.find(key);
    const SampleSettings settings = deps_.padSettings(padId);
    const auto decision = resolveRelease(it != notes_.end() && it->second.held, settings.oneShot,
                                         it == notes_.end() || it->second.audioReleased);
    if (it == notes_.end() || !decision.record) return;

    Held& entry = it->second;
    entry.held = false;
    if (decision.releaseAudio) endVoice(entry);
    const std::optional<Pending> pending = entry.pending;
    if (entry.audioReleased) notes_.erase(it);

    if (!pending || !deps_.isRecording()) return;
    const auto timing = deps_.loopTiming(pending->loop);
    if (!timing) return;

    // Playback caps the duration at the sample's length, so it isn't capped here
    SampleEvent hit;
    hit.startTicks = wrapTicks(pending->startTicks, *timing);
    hit.duration = elapsedInLoop(pending->startSeconds, deps_.transportSeconds(), *timing);
    hit.note = note;
    hit.velocity = pending->velocity;
    deps_.emit(evt::HitRecorded{padId, pending->loop, hit});
}

void LiveInput::reset() {
    for (auto& [key, entry] : notes_) {
        if (!entry.audioReleased) endVoice(entry);
        else if (entry.timer) deps_.cancelTimer(*entry.timer);
    }
    notes_.clear();
}

} // namespace citizen
