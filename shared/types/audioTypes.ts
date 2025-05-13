import * as Tone from "../../frontend/node_modules/tone";
import {
  //   AudioRange,
  //   Cents,
  //   Decibels,
  Frequency,
  //   NormalRange,
  //   Time,
} from "../../frontend/node_modules/tone/build/esm/core/type/Units";

import { CustomSampler } from "../../frontend/src/lib/audio/CustomSampler";

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

export type Loop = {
  loop: string;
  bpm: number;
  beats: number;
  samples: SampleType[];
};

export type Song = {
  id: string;
  title: string;
  bpm: number;
  loops: Loop[];
};
