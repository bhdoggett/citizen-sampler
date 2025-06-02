import {
  Ticks,
  Frequency,
  NormalRange,
} from "../../frontend/node_modules/tone/build/esm/core/type/Units";

export type QuantizeValue = 1 | 2 | 4 | 8 | 16;

export type SampleEvent = {
  startTime: Ticks | null;
  duration: number | null;
  note: Frequency;
  velocity: NormalRange;
};

type SampleUISettings = {
  zoom: number;
  seekTo: number;
};

export type SampleSettings = {
  mute: boolean;
  solo: boolean;
  reverse: boolean;
  timeStretch: boolean;
  oneShot: boolean;
  loop: boolean;
  start: number;
  end: number | null;
  volume: number;
  pan: number;
  baseNote: Frequency;
  pitch: number;
  attack: number;
  release: number;
  quantize: boolean;
  quantVal: number | string;
  highpass: [number, "highpass", number?];
  lowpass: [number, "lowpass", number?];
  ui: SampleUISettings;
};

export type SampleType = {
  id: string;
  title: string;
  type: string;
  collectionName: string;
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
  swing: NormalRange;
};

export type AllLoopSettings = {
  [key in LoopName]: LoopSettings | null;
};

export type SongTypeBase = {
  title: string;
  loops: AllLoopSettings;
  samples: Record<string, SampleType>;
};

export type SongTypeFE = SongTypeBase & {
  _id?: string;
};
