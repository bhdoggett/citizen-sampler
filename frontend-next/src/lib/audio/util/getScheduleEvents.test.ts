import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTransport } from "src/test/toneMock";
import type { SampleEventFE, SampleTypeFE } from "src/types/audioTypesFE";
import getScheduleEvents from "./getScheduleEvents";

vi.mock("tone", async () => (await import("src/test/toneMock")).toneMock);

// 192 ticks per quarter note; at 120 BPM that is 0.5 s.
const event = (
  startTime: number | null,
  overrides: Partial<SampleEventFE> = {}
): SampleEventFE => ({
  startTime,
  duration: 0.25,
  note: "C4",
  velocity: 1,
  ...overrides,
});

const makeData = (
  events: SampleEventFE[],
  settings: { quantize?: boolean; quantVal?: string } = {}
) =>
  ({
    "pad-1": {
      events: { A: events },
      settings: { quantize: false, quantVal: "4", ...settings },
    },
  }) as unknown as Record<string, SampleTypeFE>;

describe("getScheduleEvents", () => {
  beforeEach(() => {
    resetTransport();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("converts tick start times to seconds", () => {
    const result = getScheduleEvents(
      makeData([event(192, { note: "D4", velocity: 0.5 })]),
      "pad-1",
      "A"
    );
    expect(result).toEqual([
      [0.5, { startTime: 0.5, duration: 0.25, note: "D4", velocity: 0.5 }],
    ]);
  });

  it("keeps an event on the downbeat", () => {
    const result = getScheduleEvents(makeData([event(0)]), "pad-1", "A");
    expect(result.map(([time]) => time)).toEqual([0]);
  });

  it("skips events without a start time", () => {
    const result = getScheduleEvents(
      makeData([event(null), event(192)]),
      "pad-1",
      "A"
    );
    expect(result.map(([time]) => time)).toEqual([0.5]);
  });

  it("quantizes start times when quantize is on", () => {
    // 200 ticks ≈ 0.52 s, which snaps to the 0.5 s quarter note.
    const result = getScheduleEvents(
      makeData([event(200)], { quantize: true, quantVal: "4" }),
      "pad-1",
      "A"
    );
    expect(result[0][0]).toBeCloseTo(0.5);
  });

  it("wraps events quantized to the loop end back to the loop start", () => {
    // Loop is 2 bars = 4 s. 1530 ticks ≈ 3.98 s, which snaps to 4 s.
    const result = getScheduleEvents(
      makeData([event(1530)], { quantize: true, quantVal: "4" }),
      "pad-1",
      "A"
    );
    expect(result[0][0]).toBe(0);
  });

  it("drops duplicates with the same time and note", () => {
    const result = getScheduleEvents(
      makeData(
        [event(190), event(194), event(194, { note: "E4" })],
        { quantize: true, quantVal: "4" }
      ),
      "pad-1",
      "A"
    );
    expect(result.map(([, e]) => e.note)).toEqual(["C4", "E4"]);
  });

  it("returns an empty array when the loop has no events", () => {
    expect(getScheduleEvents(makeData([]), "pad-1", "A")).toEqual([]);
  });

  describe("with an explicit loop timing", () => {
    // Live transport stays at 120 BPM in 4/4; the timing describes another loop.
    const timing = { bpm: 60, beats: 3, bars: 1 };

    it("converts ticks with the loop's tempo", () => {
      const result = getScheduleEvents(
        makeData([event(192)]),
        "pad-1",
        "A",
        timing
      );
      expect(result[0][0]).toBeCloseTo(1);
    });

    it("quantizes with the loop's tempo", () => {
      // 250 ticks ≈ 1.3 s at 60 BPM, which snaps to the 1 s quarter note.
      const result = getScheduleEvents(
        makeData([event(250)], { quantize: true, quantVal: "4" }),
        "pad-1",
        "A",
        timing
      );
      expect(result[0][0]).toBeCloseTo(1);
    });

    it("wraps at the loop's own end, using beats per bar", () => {
      // 1 bar of 3/4 at 60 BPM is 3 s. 570 ticks ≈ 2.97 s snaps to 3 s.
      const result = getScheduleEvents(
        makeData([event(570)], { quantize: true, quantVal: "4" }),
        "pad-1",
        "A",
        timing
      );
      expect(result[0][0]).toBe(0);
    });
  });
});
