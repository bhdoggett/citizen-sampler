import { describe, expect, it } from "vitest";
import { calcRenderDuration } from "./calcRenderDuration";

const event = (startTime: number, duration: number | null) =>
  [startTime, { duration }] as [number, { duration: number | null }];

describe("calcRenderDuration", () => {
  it("renders the whole loop when every event ends inside it", () => {
    expect(calcRenderDuration([event(0, 0.5), event(2, 1)], 4)).toBe(4);
  });

  it("extends past the loop end for events that ring over", () => {
    expect(calcRenderDuration([event(3.5, 1.25)], 4)).toBe(4.75);
  });

  it("treats start times as seconds, not ticks", () => {
    // A late event must push the render out by its real start time.
    expect(calcRenderDuration([event(3.9, 0.5), event(0, 0.5)], 4)).toBeCloseTo(
      4.4
    );
  });

  it("ignores events without a duration", () => {
    expect(calcRenderDuration([event(3.5, null)], 4)).toBe(4);
  });

  it("falls back to the loop length with no events", () => {
    expect(calcRenderDuration([], 4)).toBe(4);
  });
});
