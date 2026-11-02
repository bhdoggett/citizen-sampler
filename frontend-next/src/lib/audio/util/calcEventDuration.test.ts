import { describe, expect, it } from "vitest";
import { calcEventDuration } from "./calcEventDuration";

// 192 ticks = 0.5 s at 120 BPM. Loop is 2 bars = 4 s.
const timing = { bpm: 120, beats: 4, bars: 2 };

describe("calcEventDuration", () => {
  it("measures from start to release", () => {
    expect(calcEventDuration(192, 1.5, timing)).toBeCloseTo(1);
  });

  it("caps the release at the sample end", () => {
    expect(calcEventDuration(192, 3, timing, 1.25)).toBeCloseTo(0.75);
  });

  it("wraps a release read just past the loop end", () => {
    // Start 4 ticks (~0.01 s) into the loop. The transport reports the
    // release at 4.05 s on a 4 s loop, which is really 0.05 s: ~0.04 s total.
    expect(calcEventDuration(4, 4.05, timing)).toBeCloseTo(0.0396, 4);
  });

  it("wraps around the loop when release comes before start", () => {
    // Start at 3.5 s, loop wraps at 4 s, release at 0.5 s: 1 s total.
    expect(calcEventDuration(1344, 0.5, timing)).toBeCloseTo(1);
  });

  it("uses the loop's own tempo and length", () => {
    // 1 bar of 3/4 at 60 BPM is 3 s. Start at 2.5 s (480 ticks), release at 0.5 s.
    expect(
      calcEventDuration(480, 0.5, { bpm: 60, beats: 3, bars: 1 })
    ).toBeCloseTo(1);
  });
});
