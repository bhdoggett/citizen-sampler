import { describe, expect, it } from "vitest";
import { calcTriggerParams } from "./calcTriggerParams";

const pad = (overrides = {}) => ({
  start: 0,
  end: null as number | null,
  oneShot: false,
  reverse: false,
  ...overrides,
});

describe("calcTriggerParams", () => {
  it("caps the duration at the end point, scaled by playback rate", () => {
    // 1 s of sample at double speed lasts 0.5 s, shorter than the 2 s event.
    expect(calcTriggerParams(pad({ end: 1 }), 2, 2, 3)).toEqual({
      duration: 0.5,
      offset: 0,
    });
  });

  it("uses the event duration when it is shorter than the clip", () => {
    expect(calcTriggerParams(pad({ end: 2 }), 1, 0.25, 3).duration).toBe(0.25);
  });

  it("uses the event duration when no end point is set", () => {
    expect(calcTriggerParams(pad(), 1, 0.75, 3).duration).toBe(0.75);
  });

  it("plays a one-shot pad to its end point, ignoring the event duration", () => {
    expect(
      calcTriggerParams(pad({ end: 1.5, start: 0.5, oneShot: true }), 1, 0.1, 3)
        .duration
    ).toBe(1);
  });

  it("plays a one-shot pad with no end point to the end of its buffer", () => {
    // 2.5 s of buffer left after a 0.5 s start, at double speed: 1.25 s.
    expect(
      calcTriggerParams(pad({ oneShot: true, start: 0.5 }), 2, 0.1, 3).duration
    ).toBe(1.25);
  });

  it("offsets a reversed pad from the end of the buffer", () => {
    expect(
      calcTriggerParams(pad({ start: 0.5, end: 2, reverse: true }), 1, 1, 3)
        .offset
    ).toBe(1);
  });

  it("offsets a reversed pad with no end point from 0", () => {
    expect(calcTriggerParams(pad({ reverse: true }), 1, 1, 3).offset).toBe(0);
  });

  it("starts a forward pad at its start point", () => {
    expect(calcTriggerParams(pad({ start: 0.4 }), 1, 1, 3).offset).toBe(0.4);
  });

  it("treats an end point of 0 as unset", () => {
    expect(calcTriggerParams(pad({ end: 0 }), 1, 0.75, 3).duration).toBe(0.75);
  });
});
