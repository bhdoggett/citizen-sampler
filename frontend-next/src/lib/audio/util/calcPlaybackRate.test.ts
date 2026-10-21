import { describe, expect, it, vi } from "vitest";
import { calcPlaybackRate } from "./calcPlaybackRate";

vi.mock("tone", async () => (await import("src/test/toneMock")).toneMock);

describe("calcPlaybackRate", () => {
  it("plays C4 at natural speed", () => {
    expect(calcPlaybackRate("C4")).toBeCloseTo(1);
  });

  it("doubles or halves per octave", () => {
    expect(calcPlaybackRate("C5")).toBeCloseTo(2);
    expect(calcPlaybackRate("C3")).toBeCloseTo(0.5);
  });

  it("uses equal temperament between octaves", () => {
    expect(calcPlaybackRate("G4")).toBeCloseTo(Math.pow(2, 7 / 12));
  });
});
