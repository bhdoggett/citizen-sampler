import * as Tone from "tone";
import { CustomSampler } from "./CustomSampler";
import { SampleEventFE } from "./audioTypesFE";

export type SamplerWithFX = {
  id: string;
  sampler: CustomSampler;
  gain: Tone.Gain;
  pitch: Tone.PitchShift;
  panVol: Tone.PanVol;
  highpass: Tone.Filter;
  lowpass: Tone.Filter;
  analyser: Tone.Analyser;
  currentEvent: SampleEventFE;
};
