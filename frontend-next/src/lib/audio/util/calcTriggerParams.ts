import type { SampleSettingsFE } from "src/types/audioTypesFE";

type TriggerSettings = Pick<SampleSettingsFE, "start" | "end" | "oneShot" | "reverse">;

/**
 * How long a scheduled event plays and where in the buffer it starts.
 * An end point of 0 counts as unset. One-shot pads ignore the recorded
 * duration and play to their end point (or ring for 999 s without one).
 */
export function calcTriggerParams(
  settings: TriggerSettings,
  playbackRate: number,
  eventDuration: number,
  bufferDuration: number
): { duration: number; offset: number } {
  const { start, end, oneShot, reverse } = settings;
  const sampleDuration = end ? (end - start) / playbackRate : null;

  const duration = oneShot
    ? (sampleDuration ?? 999)
    : Math.min(sampleDuration ?? Infinity, eventDuration);
  const offset = reverse ? bufferDuration - (end ?? bufferDuration) : start;

  return { duration, offset };
}
