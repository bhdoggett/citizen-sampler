// bpm is the tempo of the loop the time belongs to.
const quantize = (time: number, quantVal: string, bpm: number): number => {
  const secondsPerQuarterNote = 60 / bpm;
  let quantizeSeconds;
  if (typeof quantVal === "string" && quantVal.includes("t")) {
    const tripletQuantVal = parseInt(quantVal, 10) * 1.5;
    quantizeSeconds = (secondsPerQuarterNote / tripletQuantVal) * 4;
  } else {
    quantizeSeconds = (secondsPerQuarterNote / Number(quantVal)) * 4;
  }

  const quantizedTime = Math.round(time / quantizeSeconds!) * quantizeSeconds!;
  return quantizedTime;
};

export default quantize;
