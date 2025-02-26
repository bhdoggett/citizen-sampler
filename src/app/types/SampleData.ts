import { Effect } from "tone/build/esm/effect/Effect";
import type { SamplePositions } from "./SamplePositions";
import * as Tone from "tone";

type Main = {};

type FilterType =
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "lowshelf"
  | "highshelf"
  | "notch"
  | "allpass"
  | "peaking";

type Filter = [number, FilterType];

type FX = number | number[];

type FXSettings = {};

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

type SampleTime = {
  startTime: number;
  duration: number;
};
export type SampleData = {
  id: string;
  type: string;
  title: string;
  url: string;
  pitch: Pitch; // semitones that the sample has been pitch-shifted
  finetune: number; // cents that the sample has been pitch-shifted
  times: SampleTime[];
  settings: {
    gain: number;
    attack: number;
    release: number;
    pan: number;
    highpass: Filter;
    lowpass: Filter;
  };
  attribution?: string;
};
