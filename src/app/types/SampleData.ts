import { Effect } from "tone/build/esm/effect/Effect";
import type { SamplePositions } from "./SamplePositions";
import * as Tone from "tone";

export type oldSampleData = {
  id: string;
  url: string;
  times: SamplePositions[];
};

type Main = {
  gain: number;
  pan: number;
};

type FX = {
  active: boolean;
  value: number | number[];
};

type FXSettings = {
  eq3: FX;
  reverb: FX;
  distortion: FX;
  delay: FX;
  bitcrusher: FX;
};

type Envelope = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

type Pitch = // number represents the number of semitones that the sample has been pitch-shifted

    | -12
    | -11
    | -10
    | -9
    | -8
    | -7
    | -6
    | -5
    | -4
    | -3
    | -2
    | -1
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12;

export type SampleData = {
  id: string;
  type: string;
  title: string;
  url: string;
  pitch: Pitch; // semitones that the sample has been pitch-shifted
  finetune: number; // cents that the sample has been pitch-shifted
  times: { startTime: number; duration: number };
  settings: {
    main: Main;
    envelopes: {
      amplitude: Envelope;
      pitch: Envelope;
    };
    fx: FXSettings;
  };
  attribution?: string;
};
