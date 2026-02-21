import * as Tone from "tone";

// Convert MIDI number to note name
export const midiToNoteName = (midi: number) =>
  Tone.Frequency(midi, "midi").toNote();

// Define offset arrays for each scale.
// Each sub-array represents a row in the grid, arranged to visualize the PitchGrid.
// The base note is the center index on the center inner-array.
const chromaticOffsets = [
  [8, 9, 10, 11, 12],
  [3, 4, 5, 6, 7],
  [-2, -1, 0, 1, 2],
  [-7, -6, -5, -4, -3],
  [-12, -11, -10, -9, -8],
];

const majorOffsets = [
  [14, 16, 17, 19, 21],
  [5, 7, 9, 11, 12],
  [-3, -1, 0, 2, 4],
  [-12, -10, -8, -7, -5],
  [-20, -19, -17, -15, -13],
];

const minorOffsets = [
  [14, 15, 17, 19, 20],
  [5, 7, 8, 10, 12],
  [-4, -2, 0, 2, 3],
  [-12, -10, -9, -7, -5],
  [-21, -19, -17, -16, -14],
];

const pentatonicOffsets = [
  [19, 21, 24, 26, 28],
  [7, 9, 12, 14, 16],
  [-5, -3, 0, 2, 4],
  [-17, -15, -12, -10, -8],
  [-29, -27, -24, -22, -20],
];

export type ScaleName = "chromatic" | "major" | "minor" | "pentatonic";

export const scaleOffsets: Record<ScaleName, number[][]> = {
  chromatic: chromaticOffsets,
  major: majorOffsets,
  minor: minorOffsets,
  pentatonic: pentatonicOffsets,
};

/**
 * Generate 25 notes in PitchGrid grid order (top-left to bottom-right).
 */
export const generateScaleNotes = (
  baseNote: string,
  scale: ScaleName,
): string[] => {
  const offsets = scaleOffsets[scale].flat();
  const baseMidi = Tone.Frequency(baseNote).toMidi();
  return offsets.map((offset) => midiToNoteName(baseMidi + offset));
};

/**
 * Generate 25 unique notes sorted descending by pitch (high to low) for piano roll rows.
 */
export const generatePianoRollNotes = (
  baseNote: string,
  scale: ScaleName,
): string[] => {
  const offsets = scaleOffsets[scale].flat();
  const baseMidi = Tone.Frequency(baseNote).toMidi();

  // Get unique MIDI values, sorted descending (high to low)
  const uniqueMidis = [...new Set(offsets.map((o) => baseMidi + o))].sort(
    (a, b) => b - a,
  );

  return uniqueMidis.map((midi) => midiToNoteName(midi));
};
