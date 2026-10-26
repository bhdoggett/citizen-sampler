import { loopDurationSeconds, ticksToSeconds, type LoopTiming } from "./timing";

/**
 * Calculates event duration in seconds at the moment of note release.
 * Handles sampleEnd capping and loop-wrap when release time < start time.
 * releaseTime is the transport position in seconds when the note was released.
 */
export function calcEventDuration(
  startTicks: number,
  releaseTime: number,
  timing: LoopTiming,
  sampleEnd?: number | null
): number {
  const actualReleaseTime = sampleEnd
    ? releaseTime < sampleEnd
      ? releaseTime
      : sampleEnd
    : releaseTime;

  const startTimeInSeconds = ticksToSeconds(startTicks, timing.bpm);
  const loopEndInSeconds = loopDurationSeconds(timing);

  return actualReleaseTime > startTimeInSeconds
    ? actualReleaseTime - startTimeInSeconds
    : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;
}
