import * as Tone from "tone";

// Sample buffers are always loaded at C4 in this app
const BUFFER_NOTE = "C4" as const;

export function calcPlaybackRate(note: Tone.Unit.Frequency): number {
  return (
    Tone.Frequency(note).toFrequency() /
    Tone.Frequency(BUFFER_NOTE).toFrequency()
  );
}
