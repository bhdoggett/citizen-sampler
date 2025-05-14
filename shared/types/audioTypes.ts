import * as Tone from "../../frontend/node_modules/tone";
import {
  //   AudioRange,
  //   Cents,
  //   Decibels,
  Frequency,
  //   NormalRange,
  //   Time,
} from "../../frontend/node_modules/tone/build/esm/core/type/Units";

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
  collectionName: string;
  label?: string;
  title: string;
  url: string;
  events: Record<string, SampleEvent[]>; // This has sample events indexed by Loop
  settings: SampleSettings;
  attribution?: string;
};

export type LoopName = "A" | "B" | "C" | "D";

export type LoopSettings = {
  beats: number;
  bars: number;
  bpm: number;
  // swing: number
} | null;

export type AllLoopSettings = {
  [key in LoopName]: LoopSettings;
};

export type SongType = {
  _id?: string;
  title: string;
  beats: number;
  bars: number;
  bpm: number;
  samples: SampleType[];
};
