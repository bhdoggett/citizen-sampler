import {
  SongTypeBase,
  SampleSettings,
  SampleUISettings,
  LoopName,
  LoopSettings,
} from "@shared/types/audioTypes";

import { Ticks, Frequency, NormalRange } from "tone/build/esm/core/type/Units";

// FE-specific event type using Tone types
export type SampleEventFE = {
  startTime: Ticks | null;
  duration: number | null;
  note: Frequency;
  velocity: NormalRange;
};

// Overriding shared SampleSettings with Tone types
export type SampleSettingsFE = Omit<
  SampleSettings,
  "baseNote" | "highpass" | "lowpass"
> & {
  baseNote: Frequency;
  highpass: [number, "highpass", number?];
  lowpass: [number, "lowpass", number?];
  ui: SampleUISettings;
};

// FE-specific SampleType
export type SampleTypeFE = {
  id: string;
  title: string;
  type: string;
  collectionName: string;
  url: string;
  events: Record<string, SampleEventFE[]>;
  settings: SampleSettingsFE;
  attribution?: string;
};

// Optional _id and frontend-specific loop/sample overrides
export type SongTypeFE = Omit<SongTypeBase, "samples"> & {
  _id?: string;
  samples: Record<string, SampleTypeFE>;
};

// Frontend version of LoopSettings
export type LoopSettingsFE = Omit<LoopSettings, "swing"> & {
  swing: NormalRange;
};

export type AllLoopSettingsFE = {
  [key in LoopName]: LoopSettingsFE | null;
};
