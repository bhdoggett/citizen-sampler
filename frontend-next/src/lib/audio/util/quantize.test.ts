import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTransport, transport } from "src/test/toneMock";
import quantize from "./quantize";

vi.mock("tone", async () => (await import("src/test/toneMock")).toneMock);

// At 120 BPM a quarter note is 0.5 s.
describe("quantize", () => {
  beforeEach(resetTransport);

  it("snaps to the nearest quarter note", () => {
    expect(quantize(0.24, "4")).toBeCloseTo(0);
    expect(quantize(0.26, "4")).toBeCloseTo(0.5);
    expect(quantize(1.1, "4")).toBeCloseTo(1.0);
  });

  it("snaps to straight subdivisions", () => {
    expect(quantize(0.3, "8")).toBeCloseTo(0.25);
    expect(quantize(0.13, "16")).toBeCloseTo(0.125);
    expect(quantize(1.4, "1")).toBeCloseTo(2);
  });

  it("follows the transport tempo", () => {
    transport.bpm.value = 60;
    expect(quantize(0.6, "4")).toBeCloseTo(1);
  });

  it.each([
    ["1t", 4 / 3],
    ["2t", 2 / 3],
    ["4t", 1 / 3],
    ["8t", 1 / 6],
    ["16t", 1 / 12],
    ["32t", 1 / 24],
  ])("uses a %s triplet grid of %f s", (quantVal, grid) => {
    expect(quantize(grid * 1.1, quantVal)).toBeCloseTo(grid);
    expect(quantize(grid * 2.9, quantVal)).toBeCloseTo(grid * 3);
  });

  it("uses an explicit bpm over the transport tempo", () => {
    expect(quantize(0.6, "4", 60)).toBeCloseTo(1);
  });
});
