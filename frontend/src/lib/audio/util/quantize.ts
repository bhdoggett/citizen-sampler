import * as Tone from "tone";

const quantize = (time: number, quantVal: string): number => {
  const bpm = Tone.getTransport().bpm.value;
  const secondsPerQuarterNote = 60 / bpm;
  let quantizeSeconds;
  if (quantVal.includes("t")) {
    const tripletQuantVal = Number(Array.from(quantVal)[0]) * 1.5;
    quantizeSeconds = (secondsPerQuarterNote / tripletQuantVal) * 4;
  } else {
    quantizeSeconds = (secondsPerQuarterNote / Number(quantVal)) * 4;
  }

  const quantizedTime = Math.round(time / quantizeSeconds!) * quantizeSeconds!;
  return quantizedTime;
};

export default quantize;
