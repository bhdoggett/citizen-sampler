import { describe, expect, it } from "vitest";
import {
  exponentiateFrequency,
  linearizeFrequency,
} from "./frequencyConversion";

describe("linearizeFrequency", () => {
  it("clamps to 0 at or below 20 Hz", () => {
    expect(linearizeFrequency(20)).toBe(0);
    expect(linearizeFrequency(5)).toBe(0);
  });

  it("clamps to 1 at or above 20 kHz", () => {
    expect(linearizeFrequency(20000)).toBe(1);
    expect(linearizeFrequency(30000)).toBe(1);
  });

  it("maps the geometric midpoint to 0.5", () => {
    expect(linearizeFrequency(Math.sqrt(20 * 20000))).toBeCloseTo(0.5);
  });
});

describe("exponentiateFrequency", () => {
  it("clamps slider values outside 0-1", () => {
    expect(exponentiateFrequency(-0.5)).toBe(20);
    expect(exponentiateFrequency(1.5)).toBe(20000);
  });

  it("round-trips with linearizeFrequency", () => {
    for (const hz of [40, 200, 1000, 5000, 15000]) {
      expect(exponentiateFrequency(linearizeFrequency(hz))).toBeCloseTo(hz);
    }
  });
});
