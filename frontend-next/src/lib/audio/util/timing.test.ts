import { describe, expect, it } from "vitest";
import { PPQ, elapsedInLoop, loopDurationSeconds, ticksToSeconds, wrapTicks } from "./timing";

describe("ticksToSeconds", () => {
  it("converts one quarter note of ticks at 120 BPM", () => {
    expect(ticksToSeconds(PPQ, 120)).toBeCloseTo(0.5);
  });

  it("follows the tempo it is given", () => {
    expect(ticksToSeconds(192, 60)).toBeCloseTo(1);
  });
});

describe("loopDurationSeconds", () => {
  it("measures 2 bars of 4/4 at 120 BPM", () => {
    expect(loopDurationSeconds({ bpm: 120, beats: 4, bars: 2 })).toBeCloseTo(4);
  });

  it("uses beats per bar for odd meters", () => {
    expect(loopDurationSeconds({ bpm: 60, beats: 3, bars: 1 })).toBeCloseTo(3);
  });
});

describe("wrapTicks", () => {
  // 2 bars of 4/4 is 1536 ticks.
  const timing = { bpm: 120, beats: 4, bars: 2 };

  it("leaves a position inside the loop alone", () => {
    expect(wrapTicks(100, timing)).toBe(100);
  });

  it("wraps a position read just past the loop end", () => {
    // Tone's transport can report up to one clock update past the end
    expect(wrapTicks(1540, timing)).toBe(4);
  });

  it("wraps the loop end itself to 0", () => {
    expect(wrapTicks(1536, timing)).toBe(0);
  });
});

describe("elapsedInLoop", () => {
  const timing = { bpm: 120, beats: 4, bars: 2 };

  it("returns the gap between two readings", () => {
    expect(elapsedInLoop(1, 1.25, timing)).toBeCloseTo(0.25);
  });

  it("adds the loop length when the transport wrapped", () => {
    expect(elapsedInLoop(3.75, 0.25, timing)).toBeCloseTo(0.5);
  });
});
