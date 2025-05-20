const baseFreq = 440; // reference frequency in Hz
const minSemitone = -24; // 2 octaves below
const maxSemitone = 24; // 2 octaves above

// Convert frequency (Hz) to slider value (0-1) based on semitone scale
export const linearizeFrequency = (frequency: number): number => {
  if (frequency <= 0) return 0;
  const semitoneChange = 12 * Math.log2(frequency / baseFreq);
  // Clamp semitoneChange to min/max semitones range
  const clamped = Math.min(Math.max(semitoneChange, minSemitone), maxSemitone);
  // Map semitones to 0-1 slider
  return (clamped - minSemitone) / (maxSemitone - minSemitone);
};

// Convert slider value (0-1) back to frequency (Hz) using semitones
export const exponentiateFrequency = (sliderValue: number): number => {
  if (sliderValue <= 0) return 0;
  // Map slider 0-1 to semitone range
  const semitoneChange =
    sliderValue * (maxSemitone - minSemitone) + minSemitone;
  // Convert semitone change back to frequency
  return baseFreq * Math.pow(2, semitoneChange / 12);
};
