import { describe, expect, it } from "vitest";
import type { SampleTypeFE } from "src/types/audioTypesFE";
import { computeGain, normalizeAllMuteSolo, normalizeMuteSolo } from "./muteSolo";

describe("computeGain", () => {
  it("silences a muted pad", () => {
    expect(computeGain({ mute: true, solo: false }, false)).toBe(0);
  });

  it("silences a pad that isn't soloed while another pad is", () => {
    expect(computeGain({ mute: false, solo: false }, true)).toBe(0);
  });

  it("plays a soloed pad", () => {
    expect(computeGain({ mute: false, solo: true }, true)).toBe(1);
  });

  it("plays a pad when nothing is muted or soloed", () => {
    expect(computeGain({ mute: false, solo: false }, false)).toBe(1);
  });
});

describe("normalizeMuteSolo", () => {
  it("lets solo win when saved data has both flags on", () => {
    expect(normalizeMuteSolo({ mute: true, solo: true })).toEqual({
      mute: false,
      solo: true,
    });
  });

  it("leaves valid settings unchanged", () => {
    const settings = { mute: true, solo: false, volume: -3 };
    expect(normalizeMuteSolo(settings)).toBe(settings);
  });
});

describe("normalizeAllMuteSolo", () => {
  it("normalizes every pad and keeps the other fields", () => {
    const data = {
      "pad-1": { id: "pad-1", title: "kick", settings: { mute: true, solo: true, pan: 0.5 } },
      "pad-2": { id: "pad-2", title: "snare", settings: { mute: true, solo: false, pan: 0 } },
    } as unknown as Record<string, SampleTypeFE>;

    const result = normalizeAllMuteSolo(data);

    expect(result["pad-1"]).toMatchObject({
      id: "pad-1",
      title: "kick",
      settings: { mute: false, solo: true, pan: 0.5 },
    });
    expect(result["pad-2"]).toBe(data["pad-2"]);
  });
});
