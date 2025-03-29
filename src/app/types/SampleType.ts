import {
  AudioRange,
  Cents,
  Decibels,
  Frequency,
  NormalRange,
  Time,
} from "tone/build/esm/core/type/Units";

export type SampleEvent = {
  startTime: number;
  duration: number;
  // velocity: number;
};
export type SampleSettings = {
  volume: number;
  pan: number;
  pitch: number;
  finetune: number;
  attack: number;
  release: number;
  quantize: boolean;
  quantVal: number;
  highpass: [number, "highpass", number?];
  lowpass: [number, "lowpass", number?];
};

export type SampleType = {
  id: string;
  type: string;
  label?: string;
  title: string;
  url: string;
  events: SampleEvent[];
  settings: SampleSettings;
  attribution?: string;
};
