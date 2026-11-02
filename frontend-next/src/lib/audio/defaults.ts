import type { AllLoopSettingsFE, SampleSettingsFE } from "src/types/audioTypesFE";

// Settings for a freshly loaded pad. Returns new objects each call, so no
// two pads share a filter tuple or UI state.
export function defaultSampleSettings(): SampleSettingsFE {
  return {
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
  };
}

export const DEFAULT_LOOP_TIMING = { beats: 4, bars: 2, bpm: 120, swing: 0 } as const;

// Loop A starts initialized; B to D are set up the first time they are selected
export function defaultLoopSettings(): AllLoopSettingsFE {
  return {
    A: { ...DEFAULT_LOOP_TIMING, isInitialized: true },
    B: { ...DEFAULT_LOOP_TIMING, isInitialized: false },
    C: { ...DEFAULT_LOOP_TIMING, isInitialized: false },
    D: { ...DEFAULT_LOOP_TIMING, isInitialized: false },
  };
}
