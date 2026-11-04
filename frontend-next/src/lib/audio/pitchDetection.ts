export type PitchResult = { note: string; cents: number };

const EMA_ALPHA = 0.35; // faster convergence than old 0.15
const STABLE_FRAMES = 3; // fewer frames needed before showing note

// Harmonic Product Spectrum pitch detection on FFT magnitude bins (dB scale).
// Sums 3 harmonics in dB space (equivalent to multiplying in linear space).
// Significantly more robust than autocorrelation for noisy/polyphonic audio.
export function detectPitch(
  fftBins: Float32Array,
  sampleRate: number,
): number | null {
  const N = fftBins.length; // fftSize / 2 bins
  const binHz = sampleRate / (N * 2);

  const minBin = Math.ceil(50 / binHz);
  const maxBin = Math.floor(2000 / binHz);

  // Silence check: average magnitude in range must clear the noise floor.
  // Tone.Analyser FFT returns dB values; -100 dBFS is effectively silence.
  let sum = 0;
  for (let i = minBin; i <= maxBin; i++) sum += fftBins[i];
  if (sum / (maxBin - minBin) < -85) return null;

  let bestBin = -1;
  let bestProduct = -Infinity;

  for (let k = minBin; k <= maxBin; k++) {
    const k2 = Math.min(k * 2, N - 1);
    const k3 = Math.min(k * 3, N - 1);
    // Summing dB values is equivalent to multiplying linear magnitudes
    const product = fftBins[k] + fftBins[k2] + fftBins[k3];
    if (product > bestProduct) {
      bestProduct = product;
      bestBin = k;
    }
  }

  if (bestBin === -1) return null;
  return bestBin * binHz;
}

export function freqToNoteCents(freq: number): PitchResult {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const midiNote = 69 + 12 * Math.log2(freq / 440);
  const nearest = Math.round(midiNote);
  const cents = Math.round((midiNote - nearest) * 100);
  const octave = Math.floor(nearest / 12) - 1;
  const note = NOTE_NAMES[((nearest % 12) + 12) % 12] + octave;
  return { note, cents };
}

export type PitchSmoother = {
  // Feed one raw reading (Hz, or null for silence). Returns what to display.
  step: (rawFreq: number | null, pitchShiftSemitones: number) => PitchResult | null;
};

// Smooths the needle and waits for a few stable readings before changing the
// note name, so the tuner doesn't flicker.
export function createPitchSmoother(): PitchSmoother {
  let smoothed: number | null = null;
  let displayedNote: string | null = null;
  let candidateNote: string | null = null;
  let candidateCount = 0;

  return {
    step: (rawFreq, pitchShiftSemitones) => {
      if (!rawFreq) {
        smoothed = null;
        candidateCount = 0;
        return null;
      }

      // The analyser is tapped before the pitch shifter, so add the shift
      // back mathematically
      const shifted = rawFreq * Math.pow(2, pitchShiftSemitones / 12);
      smoothed =
        smoothed === null ? shifted : EMA_ALPHA * shifted + (1 - EMA_ALPHA) * smoothed;

      const { note, cents } = freqToNoteCents(smoothed);
      if (note === candidateNote) {
        candidateCount++;
      } else {
        candidateNote = note;
        candidateCount = 1;
      }

      displayedNote =
        candidateCount >= STABLE_FRAMES ? note : (displayedNote ?? note);
      return { note: displayedNote, cents };
    },
  };
}
