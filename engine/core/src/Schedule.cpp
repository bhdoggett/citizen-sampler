#include "citizen/Schedule.h"

#include <algorithm>
#include <cmath>

#include "citizen/Rules.h"

namespace citizen {

std::vector<ScheduledHit> buildSchedule(const PadState& pad, Loop loop, const LoopTiming& timing) {
    const double loopEnd = loopDurationSeconds(timing);
    std::vector<ScheduledHit> hits;

    for (const auto& event : pad.events[loopIndex(loop)]) {
        if (!event.startTicks) continue;
        double time = ticksToSeconds(*event.startTicks, timing.bpm);
        if (pad.settings.quantize) time = quantize(time, pad.settings.quantVal, timing.bpm);
        // A hit snapped onto the loop end plays at the start. The snapped time
        // and the loop length can differ in the last float digit.
        if (std::abs(time - loopEnd) < 1e-9) time = 0.0;

        const bool duplicate = std::any_of(hits.begin(), hits.end(), [&](const ScheduledHit& h) {
            return h.time == time && h.note == event.note;
        });
        if (!duplicate) hits.push_back({time, event.note, event.velocity, event.duration});
    }
    return hits;
}

double calcRenderDuration(const std::vector<ScheduledHit>& hits, double loopDuration) {
    double end = loopDuration;
    for (const auto& h : hits) {
        if (h.duration) end = std::max(end, h.time + *h.duration);
    }
    return end;
}

} // namespace citizen
