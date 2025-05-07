import * as Tone from "tone";

import {
  //   AudioRange,
  //   Cents,
  //   Decibels,
  Frequency,
  //   NormalRange,
  //   Time,
} from "tone/build/esm/core/type/Units";

export type QuantizeValue = 1 | 2 | 4 | 8 | 16;

export type SampleEvent = {
  startTime: number | null;
  duration: number | null;
  note: Frequency;
  // velocity: number | null;
};

export type SampleSettings = {
  mute: boolean;
  solo: boolean;
  reverse: boolean;
  start: number;
  end: number | null;
  volume: number;
  pan: number;
  baseNote: Frequency;
  pitch: number;
  attack: number;
  release: number;
  quantize: boolean;
  quantVal: number;
  highpass: [number, "highpass", number?];
  lowpass: [number, "lowpass", number?];
};

export type SampleType = {
  id: string;
  collection: string;
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
  pitch: Tone.PitchShift;
  panVol: Tone.PanVol;
  highpass: Tone.Filter;
  lowpass: Tone.Filter;
  currentEvent: SampleEvent;
};
