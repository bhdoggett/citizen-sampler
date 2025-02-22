type QuantizeValue = 1 | 2 | 4 | 8 | 16;

const quantize = (
  time: number,
  bpm: number,
  quantizeValue: QuantizeValue
): number => {
  const secondsPerQuarterNote = 60 / bpm;

  const quantizeSeconds = (secondsPerQuarterNote / quantizeValue) * 4;

  const quantizedTime = Math.round(time / quantizeSeconds) * quantizeSeconds;

  console.log("seconds per quarter note:", secondsPerQuarterNote);
  console.log(
    `quantize seconds for quantize value of ${quantizeValue} at ${bpm}`,
    quantizeSeconds
  );

  return quantizedTime;
};

export default quantize;
