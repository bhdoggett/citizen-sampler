import {
  AudioRange,
  Cents,
  Decibels,
  Frequency,
  GainFactor,
  NormalRange,
  Time,
} from "tone/build/esm/core/type/Units";

export type SampleType = {
  id: string;
  type: string;
  label?: string;
  title: string;
  url: string;
  times: number[];
  settings: {
    pan: NormalRange;
    volume: Decibels;
    pitch: AudioRange;
    finetune: Cents;
    attack: Time;
    release: Time;
    highpass: [Frequency?, string?, number?];
    lowpass: [Frequency?, string?, number?];
  };
  attribution?: string;
};
