import { describe, expect, it } from "vitest";
import { currentPosition, type TransportAnchor } from "./transportClock";

const anchor = (patch: Partial<TransportAnchor> = {}): TransportAnchor => ({
  type: "transport",
  playing: true,
  recording: false,
  loop: "A",
  position: 1,
  loopDuration: 4,
  receivedAt: 10_000,
  ...patch,
});

describe("currentPosition", () => {
  it("advances from the anchor by the time since it arrived", () => {
    expect(currentPosition(anchor(), 10_500)).toBeCloseTo(1.5);
  });

  it("wraps at the loop end", () => {
    expect(currentPosition(anchor(), 13_500)).toBeCloseTo(0.5);
  });

  it("stays at the anchor while stopped", () => {
    expect(currentPosition(anchor({ playing: false, position: 0 }), 20_000)).toBe(0);
  });

  it("never runs backwards when the clock reads before the anchor", () => {
    expect(currentPosition(anchor(), 9_000)).toBe(1);
  });

  it("returns 0 for a loop with no length", () => {
    expect(currentPosition(anchor({ loopDuration: 0 }), 11_000)).toBe(0);
  });
});
