import { describe, expect, it } from "vitest";
import { createPitchSmoother, freqToNoteCents } from "./pitchDetection";

describe("freqToNoteCents", () => {
  it("names A4 at 440 Hz with no cents off", () => {
    expect(freqToNoteCents(440)).toEqual({ note: "A4", cents: 0 });
  });
});

describe("createPitchSmoother", () => {
  it("returns null for silence", () => {
    expect(createPitchSmoother().step(null, 0)).toBeNull();
  });

  it("adds the pad's pitch shift back to the reading", () => {
    const result = createPitchSmoother().step(440, 12);
    expect(result?.note).toBe("A5");
  });

  it("keeps showing the old note until the new one is stable", () => {
    const smoother = createPitchSmoother();
    for (let i = 0; i < 5; i++) smoother.step(440, 0);
    // One reading of a far note moves the needle but not the name
    expect(smoother.step(880, 0)?.note).toBe("A4");
  });
});
