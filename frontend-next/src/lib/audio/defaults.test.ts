import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOOP_TIMING,
  defaultLoopSettings,
  defaultSampleSettings,
} from "./defaults";

describe("defaultSampleSettings", () => {
  it("returns the default pad settings", () => {
    expect(defaultSampleSettings()).toEqual({
      mute: false,
      solo: false,
      reverse: false,
      timeStretch: false,
      oneShot: false,
      loop: false,
      start: 0,
      end: null,
      volume: 0,
      pan: 0,
      baseNote: "C4",
      pitch: 0,
      attack: 0,
      release: 0,
      quantize: false,
      quantVal: "4",
      highpass: [0, "highpass"],
      lowpass: [20000, "lowpass"],
      ui: { zoom: 0, seekTo: 0 },
    });
  });

  it("returns fresh objects each call, down to the nested ones", () => {
    const first = defaultSampleSettings();
    const second = defaultSampleSettings();
    expect(first).not.toBe(second);
    expect(first.highpass).not.toBe(second.highpass);
    expect(first.ui).not.toBe(second.ui);
  });
});

describe("defaultLoopSettings", () => {
  it("initializes only loop A", () => {
    const loops = defaultLoopSettings();
    expect(loops.A?.isInitialized).toBe(true);
    expect(loops.B?.isInitialized).toBe(false);
    expect(loops.C?.isInitialized).toBe(false);
    expect(loops.D?.isInitialized).toBe(false);
  });

  it("gives every loop the default timing of 2 bars", () => {
    const loops = defaultLoopSettings();
    expect(loops.A).toEqual({ ...DEFAULT_LOOP_TIMING, isInitialized: true });
    expect(loops.D?.bars).toBe(2);
  });

  it("returns fresh loop objects each call", () => {
    expect(defaultLoopSettings().A).not.toBe(defaultLoopSettings().A);
  });
});
