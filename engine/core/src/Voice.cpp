#include "citizen/Voice.h"

#include <algorithm>
#include <cmath>

namespace citizen {

namespace {
long long gStartCount = 0;
}

void Voice::start(const Start& params, double outputSampleRate) {
    buffer_ = params.buffer;
    active_ = buffer_ != nullptr && buffer_->numFrames() > 0;
    note_ = params.note;
    position_ = std::max(0.0, params.offsetSeconds) * (buffer_ ? buffer_->sampleRate : 0.0);
    step_ = params.rate * (buffer_ ? buffer_->sampleRate : outputSampleRate) / outputSampleRate;
    velocity_ = params.velocity;
    delay_ = std::max(0, params.delayFrames);
    attackFrames_ = static_cast<int>(std::max(0.0, params.attackSeconds) * outputSampleRate);
    releaseFrames_ = static_cast<int>(std::max(0.0, params.releaseSeconds) * outputSampleRate);
    played_ = 0;
    releaseAt_ = -1;
    age_ = ++gStartCount;
}

void Voice::releaseAfter(int frames) {
    if (!active_) return;
    // Counted from the start of playback, after any remaining delay
    const long long at = played_ + std::max(0, frames - delay_);
    if (releaseAt_ < 0 || at < releaseAt_) releaseAt_ = at;
}

void Voice::render(float* left, float* right, int frames) {
    if (!active_) return;
    const int numFrames = buffer_->numFrames();
    const float* srcL = buffer_->channels[0].data();
    const float* srcR = buffer_->channels.size() > 1 ? buffer_->channels[1].data() : srcL;

    int n = 0;
    if (delay_ > 0) {
        n = std::min(delay_, frames);
        delay_ -= n;
    }

    for (; n < frames; ++n) {
        const int i0 = static_cast<int>(position_);
        if (i0 >= numFrames) {
            active_ = false;
            return;
        }

        float gain = velocity_;
        if (attackFrames_ > 0 && played_ < attackFrames_) {
            gain *= static_cast<float>(played_) / static_cast<float>(attackFrames_);
        }
        if (releaseAt_ >= 0 && played_ >= releaseAt_) {
            const long long into = played_ - releaseAt_;
            if (into >= releaseFrames_) {
                active_ = false;
                return;
            }
            gain *= 1.0f - static_cast<float>(into) / static_cast<float>(releaseFrames_);
        }

        const int i1 = std::min(i0 + 1, numFrames - 1);
        const float frac = static_cast<float>(position_ - i0);
        left[n] += (srcL[i0] + (srcL[i1] - srcL[i0]) * frac) * gain;
        right[n] += (srcR[i0] + (srcR[i1] - srcR[i0]) * frac) * gain;

        position_ += step_;
        ++played_;
    }
}

} // namespace citizen
