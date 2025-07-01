export type QuantizeValue = 1 | 2 | 4 | 8 | 16;

export type SampleEvent = {
  startTime: number | null; // formerly Ticks
  duration: number | null;
  note: string; // formerly Frequency
  velocity: number; // formerly NormalRange (0–1 range)
};

export type SampleUISettings = {
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
  baseNote: string; // formerly Frequency
  pitch: number;
  attack: number;
  release: number;
  quantize: boolean;
  quantVal: QuantizeValue;
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
  events: Record<string, SampleEvent[]>; // Indexed by loop name
  settings: SampleSettings;
  attribution?: string;
};

export type LoopName = "A" | "B" | "C" | "D";

export type LoopSettings = {
  beats: number;
  bars: number;
  bpm: number;
  swing: number;
  isInitialized: boolean;
};

export type AllLoopSettings = {
  [key in LoopName]: LoopSettings | null;
};

export type SongTypeBase = {
  title: string;
  loops: AllLoopSettings;
  samples: Record<string, SampleType>;
};
