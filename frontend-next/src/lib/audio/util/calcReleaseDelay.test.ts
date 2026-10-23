import { describe, expect, it } from "vitest";
import { calcReleaseDelay } from "./calcReleaseDelay";

describe("calcReleaseDelay", () => {
  it("releases at the end point", () => {
    expect(calcReleaseDelay(0.5, 1.5, 4)).toBe(1000);
  });

  it("falls back to the buffer end when no end point is set", () => {
    // Regression: one-shot pads with end === null never released
    expect(calcReleaseDelay(0, null, 2)).toBe(2000);
    expect(calcReleaseDelay(0.5, null, 2)).toBe(1500);
  });

  it("scales by playback rate", () => {
    expect(calcReleaseDelay(0, 2, 4, 2)).toBe(1000);
    expect(calcReleaseDelay(0, null, 1, 0.5)).toBe(2000);
  });
});
