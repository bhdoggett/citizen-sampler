import { describe, expect, it } from "vitest";
import type { LoopSettingsFE } from "src/types/audioTypesFE";
import { applyLoopSettings, type TransportLike } from "./applyLoopSettings";

const makeTransport = (): TransportLike => ({
  bpm: { value: 120 },
  swing: 0,
  timeSignature: 4,
  loop: false,
  loopStart: "1:0:0",
  loopEnd: "2:0:0",
});

describe("applyLoopSettings", () => {
  it("sets tempo, swing, meter and loop bounds from the loop", () => {
    const transport = makeTransport();
    const settings = {
      bpm: 90,
      swing: 0.2,
      beats: 3,
      bars: 4,
      isInitialized: true,
    } as LoopSettingsFE;

    applyLoopSettings(transport, settings);

    expect(transport).toEqual({
      bpm: { value: 90 },
      swing: 0.2,
      timeSignature: 3,
      loop: true,
      loopStart: "0:0:0",
      loopEnd: "4:0:0",
    });
  });
});
