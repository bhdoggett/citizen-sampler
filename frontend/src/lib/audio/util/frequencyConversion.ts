const minFreq = 20; // Typical low end for audio
const maxFreq = 2000; // Your desired max

// Convert frequency (Hz) to slider value (0-1) using logarithmic scale
export const linearizeFrequency = (frequency: number): number => {
  if (frequency <= minFreq) return 0;
  if (frequency >= maxFreq) return 1;

  // Logarithmic mapping: log(freq/min) / log(max/min)
  return Math.log(frequency / minFreq) / Math.log(maxFreq / minFreq);
};

// Convert slider value (0-1) back to frequency (Hz)
export const exponentiateFrequency = (sliderValue: number): number => {
  if (sliderValue <= 0) return minFreq;
  if (sliderValue >= 1) return maxFreq;

  // Exponential mapping: min * (max/min)^sliderValue
  return minFreq * Math.pow(maxFreq / minFreq, sliderValue);
};
