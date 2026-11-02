import { describe, expect, it } from "vitest";
import type { SampleSettingsFE } from "src/types/audioTypesFE";
import { resolveSyncSettings } from "./resolveSyncSettings";

const saved = { volume: -3, pan: 0, mute: false } as unknown as SampleSettingsFE;

describe("resolveSyncSettings", () => {
  it("merges the panel's edits over the pad's saved settings", () => {
    expect(
      resolveSyncSettings("pad-2", "pad-2", { volume: -9 }, saved)
    ).toEqual({ volume: -9, pan: 0, mute: false });
  });

  it("skips when the panel still holds another pad's settings", () => {
    // Right after switching from pad 1 to pad 2, before pad 2's values load
    expect(
      resolveSyncSettings("pad-2", "pad-1", { volume: -9 }, saved)
    ).toBeNull();
  });

  it("skips when the panel has no settings yet", () => {
    expect(resolveSyncSettings("pad-2", null, null, saved)).toBeNull();
  });

  it("skips when the pad has no saved settings", () => {
    expect(resolveSyncSettings("pad-2", "pad-2", { volume: -9 }, undefined)).toBeNull();
  });
});
