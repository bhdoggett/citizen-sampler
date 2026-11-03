#pragma once

#include <optional>
#include <string>
#include <vector>

#include "citizen/Types.h"

namespace citizen {

// One recorded hit, placed in a loop
struct ScheduledHit {
    double time = 0.0;               // seconds into the loop, quantized, before swing
    std::string note;
    double velocity = 1.0;
    std::optional<double> duration;  // seconds; hits without one don't play
};

// A pad's hits for one loop, in seconds. Mirrors getScheduleEvents.ts: hits
// are quantized when the pad has quantize on, a hit snapped onto the loop end
// moves to the start, and hits at the same time and note play once.
std::vector<ScheduledHit> buildSchedule(const PadState& pad, Loop loop, const LoopTiming& timing);

// Seconds to render for a stem: the loop, plus any tail that rings past it
double calcRenderDuration(const std::vector<ScheduledHit>& hits, double loopDuration);

} // namespace citizen
