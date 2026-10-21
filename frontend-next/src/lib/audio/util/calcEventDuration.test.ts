import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTransport, transport } from "src/test/toneMock";
import { calcEventDuration } from "./calcEventDuration";

vi.mock("tone", async () => (await import("src/test/toneMock")).toneMock);

// 192 ticks = 0.5 s at 120 BPM. Loop is 2 bars = 4 s.
describe("calcEventDuration", () => {
  beforeEach(resetTransport);

  it("measures from start to release", () => {
    transport.seconds = 1.5;
    expect(calcEventDuration(192, "2m")).toBeCloseTo(1);
  });

  it("caps the release at the sample end", () => {
    transport.seconds = 3;
    expect(calcEventDuration(192, "2m", 1.25)).toBeCloseTo(0.75);
  });

  it("wraps around the loop when release comes before start", () => {
    // Start at 3.5 s, loop wraps at 4 s, release at 0.5 s: 1 s total.
    transport.seconds = 0.5;
    expect(calcEventDuration(1344, "2m")).toBeCloseTo(1);
  });
});
