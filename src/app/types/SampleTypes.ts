import * as Tone from "tone";

// import {
//   AudioRange,
//   Cents,
//   Decibels,
//   Frequency,
//   NormalRange,
//   Time,
// } from "tone/build/esm/core/type/Units";

export type QuantizeValue = 1 | 2 | 4 | 8 | 16;

export type SampleEvent = {
  startTime: number;
  duration: number;
  // velocity: number;
};
export type SampleSettings = {
  mute: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  pitch: number;
  finetune: number;
  attack: number;
  release: number;
  quantize: boolean;
  quantVal: QuantizeValue;
  highpass: [number, "highpass", number?];
  lowpass: [number, "lowpass", number?];
};

export type SampleType = {
  id: string;
  type: string;
  pad: number;
  label?: string;
  title: string;
  url: string;
  events: SampleEvent[];
  settings: SampleSettings;
  attribution?: string;
};

export type SamplerWithFX = {
  id: string;
  sampler: Tone.Sampler;
  gain: Tone.Gain;
  panVol: Tone.PanVol;
  highpass: Tone.Filter;
  lowpass: Tone.Filter;
  currentEvent: SampleEvent | null;
};
