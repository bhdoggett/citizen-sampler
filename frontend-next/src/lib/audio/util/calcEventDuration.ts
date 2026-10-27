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
  const loopEndInSeconds = loopDurationSeconds(timing);
  // The transport can report a release a few ms past the loop end
  const wrappedReleaseTime = releaseTime % loopEndInSeconds;

  const actualReleaseTime = sampleEnd
    ? wrappedReleaseTime < sampleEnd
      ? wrappedReleaseTime
      : sampleEnd
    : wrappedReleaseTime;

  const startTimeInSeconds = ticksToSeconds(startTicks, timing.bpm);

  return actualReleaseTime > startTimeInSeconds
    ? actualReleaseTime - startTimeInSeconds
    : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;
}
