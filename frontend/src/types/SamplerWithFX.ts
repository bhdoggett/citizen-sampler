import * as Tone from "tone";
import { CustomSampler } from "./CustomSampler";
import { SampleEvent } from "@shared/types/audioTypes";

export type SamplerWithFX = {
  id: string;
  sampler: CustomSampler;
  gain: Tone.Gain;
  pitch: Tone.PitchShift;
  panVol: Tone.PanVol;
  highpass: Tone.Filter;
  lowpass: Tone.Filter;
  currentEvent: SampleEvent;
};
