import * as Tone from "tone";

/**
 * Calculates event duration in seconds at the moment of note release.
 * Handles sampleEnd capping and loop-wrap when release time < start time.
 */
export function calcEventDuration(
  startTicks: number,
  loopEnd: Tone.Unit.Time,
  sampleEnd?: number | null
): number {
  const releaseTime = Tone.getTransport().seconds;

  const actualReleaseTime = sampleEnd
    ? releaseTime < sampleEnd
      ? releaseTime
      : sampleEnd
    : releaseTime;

  const startTimeInSeconds = Tone.Ticks(startTicks).toSeconds();
  const loopEndInSeconds = Tone.Time(loopEnd).toSeconds();

  return actualReleaseTime > startTimeInSeconds
    ? actualReleaseTime - startTimeInSeconds
    : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;
}
