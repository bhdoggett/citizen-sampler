import { describe, expect, it } from "vitest";
import { extractPeaks } from "./decodeAudio";

const fakeBuffer = (samples: number[]) =>
  ({ getChannelData: () => Float32Array.from(samples) }) as unknown as AudioBuffer;

describe("extractPeaks", () => {
  it("takes the absolute max of each bin", () => {
    const peaks = extractPeaks(fakeBuffer([0.1, -0.4, 0.2, 0.3]), 2, false);
    expect(Array.from(peaks)).toEqual([
      expect.closeTo(0.4),
      expect.closeTo(0.3),
    ]);
  });

  it("normalizes to the loudest peak", () => {
    const peaks = extractPeaks(fakeBuffer([0.25, 0.5]), 2, true);
    expect(Array.from(peaks)).toEqual([0.5, 1]);
  });

  it("still finds peaks when the buffer is shorter than the bin count", () => {
    // Regression: short drum hits (fewer samples than bins) drew no waveform
    const peaks = extractPeaks(fakeBuffer([0.5, -1, 0.25]), 8, true);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks.every((p) => p > 0)).toBe(true);
  });

  it("covers every sample when the length is not a multiple of the bin count", () => {
    const peaks = extractPeaks(fakeBuffer([0, 0, 0, 0, 0, 0, 0.9]), 3, false);
    expect(peaks[2]).toBeCloseTo(0.9);
  });
});
