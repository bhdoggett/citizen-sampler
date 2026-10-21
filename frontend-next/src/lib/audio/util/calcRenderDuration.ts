type TimedEvent = [number, { duration: number | null }];

/**
 * Length in seconds to render a stem: the full loop, extended if any event
 * rings past the loop end. Event times are the seconds values from
 * getScheduleEvents, which are already quantized.
 */
export function calcRenderDuration(
  scheduleEvents: TimedEvent[],
  loopDuration: number
): number {
  return scheduleEvents.reduce((maxEnd, [startTime, { duration }]) => {
    if (duration === null) return maxEnd;
    return Math.max(maxEnd, startTime + duration);
  }, loopDuration);
}
