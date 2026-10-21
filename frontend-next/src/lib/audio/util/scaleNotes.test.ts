import { describe, expect, it, vi } from "vitest";
import {
  generatePianoRollNotes,
  generateScaleNotes,
  scaleOffsets,
  type ScaleName,
} from "./scaleNotes";

vi.mock("tone", async () => (await import("src/test/toneMock")).toneMock);

const scales = Object.keys(scaleOffsets) as ScaleName[];

describe("scaleOffsets", () => {
  it.each(scales)("%s is a 5x5 grid centered on the base note", (scale) => {
    const grid = scaleOffsets[scale];
    expect(grid).toHaveLength(5);
    grid.forEach((row) => expect(row).toHaveLength(5));
    expect(grid[2][2]).toBe(0);
  });

  it.each(scales)("%s rises from bottom-left to top-right", (scale) => {
    const ascending = [...scaleOffsets[scale]].reverse().flat();
    ascending.slice(1).forEach((offset, i) => {
      expect(offset).toBeGreaterThan(ascending[i]);
    });
  });
});

describe("generateScaleNotes", () => {
  it("matches the chromatic PitchGrid layout around C4", () => {
    const notes = generateScaleNotes("C4", "chromatic");
    expect(notes).toHaveLength(25);
    expect(notes.slice(0, 5)).toEqual(["G#4", "A4", "A#4", "B4", "C5"]);
    expect(notes[12]).toBe("C4");
    expect(notes.slice(20)).toEqual(["C3", "C#3", "D3", "D#3", "E3"]);
  });

  it("places the base note in the center for every scale", () => {
    scales.forEach((scale) => {
      expect(generateScaleNotes("A3", scale)[12]).toBe("A3");
    });
  });
});

describe("generatePianoRollNotes", () => {
  it("returns unique notes sorted high to low", () => {
    const notes = generatePianoRollNotes("C4", "chromatic");
    expect(new Set(notes).size).toBe(notes.length);
    expect(notes[0]).toBe("C6");
    expect(notes[notes.length - 1]).toBe("C2");
  });

  it("extends the scale one octave each way", () => {
    // Pentatonic grid spans -29..28; the extended range is -41..40.
    const notes = generatePianoRollNotes("C4", "pentatonic");
    expect(notes[0]).toBe("E7");
    expect(notes[notes.length - 1]).toBe("G0");
  });
});
