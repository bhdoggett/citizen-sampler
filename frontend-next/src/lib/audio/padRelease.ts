/**
 * What a pad does when its key, finger or MIDI note comes up.
 * A hit is recorded whenever it was pressed, even if the sound has already
 * stopped on its own (short samples) or plays out regardless (one-shot).
 * Only the audio release depends on those.
 */
export function resolveRelease({
  held,
  oneShot,
  audioReleased,
}: {
  held: boolean;
  oneShot: boolean;
  audioReleased: boolean;
}): { releaseAudio: boolean; record: boolean } {
  if (!held) return { releaseAudio: false, record: false };
  return { releaseAudio: !oneShot && !audioReleased, record: true };
}
