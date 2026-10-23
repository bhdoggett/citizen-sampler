// Milliseconds until a triggered pad should release. With no end point set the
// sample plays to the end of its buffer, so one-shot pads still reset.
export function calcReleaseDelay(
  start: number,
  end: number | null,
  bufferDuration: number,
  playbackRate = 1,
): number {
  return (((end ?? bufferDuration) - start) / playbackRate) * 1000;
}
