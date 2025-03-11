import {
  AudioRange,
  Cents,
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
  pitch: AudioRange;
  finetune: Cents;
  times: number[];
  settings: {
    gain: GainFactor;
    attack: Time;
    release: Time;
    highpass: [Frequency?, string?, number?];
    lowpass: [Frequency?, string?, number?];
  };
  attribution: "";
};
