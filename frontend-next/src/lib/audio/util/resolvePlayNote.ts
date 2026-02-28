import * as Tone from "tone";

/**
 * All sample buffers are loaded at C4 in this app (see makeSamplerWithFX).
 * When the user sets baseNote to the sample's actual pitch, we must shift every
 * requested note by (C4 - baseNote) semitones before passing it to triggerAttack,
 * so that playing baseNote results in playback rate 1.0 (natural pitch).
 */
export function resolvePlayNote(note: string, baseNote: string): string {
  const offset = 60 - Tone.Frequency(baseNote).toMidi(); // C4_midi - baseNote_midi
  if (offset === 0) return note;
  const transposedMidi = Tone.Frequency(note).toMidi() + offset;
  return Tone.Frequency(transposedMidi, "midi").toNote();
}
