import type { QuantizeValue } from "../../types/SampleTypes";
import * as Tone from "tone";

const quantize = (time: number, quantVal: number): number => {
  const bpm = Tone.getTransport().bpm.value;
  const secondsPerQuarterNote = 60 / bpm;
  const quantizeSeconds = (secondsPerQuarterNote / quantVal) * 4;
  const quantizedTime = Math.round(time / quantizeSeconds) * quantizeSeconds;
  return quantizedTime;
};

export default quantize;
