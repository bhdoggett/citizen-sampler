#include "citizen/PadChannel.h"

#include <algorithm>

#include "citizen/dsp/PanVol.h"

namespace citizen {

void PadChannel::prepare(double sampleRate, int maxBlockFrames) {
    sampleRate_ = sampleRate;
    busL_.assign(maxBlockFrames, 0.0f);
    busR_.assign(maxBlockFrames, 0.0f);
    pitch_.prepare(sampleRate);
    setSettings(settings_);
}

void PadChannel::setBuffer(std::shared_ptr<const SampleBuffer> buffer) {
    releaseAll();
    for (auto& v : voices_) v.kill();
    buffer_ = std::move(buffer);
    reversed_.reset();
    if (buffer_) {
        auto reversed = std::make_shared<SampleBuffer>(*buffer_);
        for (auto& channel : reversed->channels) std::reverse(channel.begin(), channel.end());
        reversed_ = std::move(reversed);
    }
}

void PadChannel::setSettings(const SampleSettings& settings) {
    settings_ = settings;
    pitch_.setPitch(settings.pitch);

    const double nyquist = sampleRate_ / 2.0;
    highpassOn_ = settings.highpass > 1.0;
    lowpassOn_ = settings.lowpass < std::min(20000.0, nyquist * 0.99);
    for (auto& f : highpass_) {
        if (highpassOn_) f.set(dsp::Biquad::Type::HighPass, std::min(settings.highpass, nyquist * 0.99), sampleRate_);
    }
    for (auto& f : lowpass_) {
        if (lowpassOn_) f.set(dsp::Biquad::Type::LowPass, std::max(settings.lowpass, 10.0), sampleRate_);
    }
}

void PadChannel::startNote(int note, double rate, float velocity, double offsetSeconds,
                           int delayFrames) {
    if (!buffer_) return;
    // Reuse a free voice, or steal the oldest
    Voice* voice = &voices_[0];
    for (auto& v : voices_) {
        if (!v.active()) {
            voice = &v;
            break;
        }
        if (v.age() < voice->age()) voice = &v;
    }
    Voice::Start start;
    start.buffer = settings_.reverse ? reversed_.get() : buffer_.get();
    start.offsetSeconds = offsetSeconds;
    start.rate = rate;
    start.velocity = velocity;
    start.attackSeconds = settings_.attack;
    start.releaseSeconds = settings_.release;
    start.delayFrames = delayFrames;
    start.note = note;
    voice->start(start, sampleRate_);
}

void PadChannel::releaseNote(int note, int delayFrames) {
    for (auto& v : voices_) {
        if (v.active() && v.note() == note) v.releaseAfter(delayFrames);
    }
}

void PadChannel::releaseAll() {
    for (auto& v : voices_) v.releaseAfter(0);
}

void PadChannel::process(float* left, float* right, int frames) {
    frames = std::min(frames, static_cast<int>(busL_.size()));
    std::fill_n(busL_.begin(), frames, 0.0f);
    std::fill_n(busR_.begin(), frames, 0.0f);

    bool any = false;
    for (auto& v : voices_) {
        if (!v.active()) continue;
        any = true;
        v.render(busL_.data(), busR_.data(), frames);
    }
    // The pitch shifter and filters still ring after the voices end, so keep
    // processing; skip only when there is no buffer at all
    if (!any && !buffer_) return;

    float* l = busL_.data();
    float* r = busR_.data();
    if (muteGain_ != 1.0f) {
        for (int n = 0; n < frames; ++n) {
            l[n] *= muteGain_;
            r[n] *= muteGain_;
        }
    }
    pitch_.process(l, r, frames);
    if (highpassOn_) {
        for (int n = 0; n < frames; ++n) {
            l[n] = highpass_[0].process(l[n]);
            r[n] = highpass_[1].process(r[n]);
        }
    }
    if (lowpassOn_) {
        for (int n = 0; n < frames; ++n) {
            l[n] = lowpass_[0].process(l[n]);
            r[n] = lowpass_[1].process(r[n]);
        }
    }

    const bool mono = buffer_ && buffer_->channels.size() < 2;
    const auto g = dsp::panGains(settings_.pan, mono);
    const float volume = dsp::dbToGain(settings_.volume);
    for (int n = 0; n < frames; ++n) {
        left[n] += (l[n] * g.ll + r[n] * g.rl) * volume;
        right[n] += (l[n] * g.lr + r[n] * g.rr) * volume;
    }
}

} // namespace citizen
