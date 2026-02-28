import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

type PitchResult = { note: string; cents: number };

const EMA_ALPHA = 0.35;  // faster convergence than old 0.15
const STABLE_FRAMES = 3; // fewer frames needed before showing note

// Harmonic Product Spectrum pitch detection on FFT magnitude bins (dB scale).
// Sums 3 harmonics in dB space (equivalent to multiplying in linear space).
// Significantly more robust than autocorrelation for noisy/polyphonic audio.
function detectPitch(fftBins: Float32Array, sampleRate: number): number | null {
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

function freqToNoteCents(freq: number): PitchResult {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const midiNote = 69 + 12 * Math.log2(freq / 440);
  const nearest = Math.round(midiNote);
  const cents = Math.round((midiNote - nearest) * 100);
  const octave = Math.floor(nearest / 12) - 1;
  const note = NOTE_NAMES[((nearest % 12) + 12) % 12] + octave;
  return { note, cents };
}

export function usePitchDetector(
  analyser: Tone.Analyser | null,
  pitchShiftSemitones: number = 0
): PitchResult | null {
  const [result, setResult] = useState<PitchResult | null>(null);

  // Smoothing state in refs so they don't cause re-renders
  const smoothedFreqRef = useRef<number | null>(null);
  const displayedNoteRef = useRef<string | null>(null);
  const candidateNoteRef = useRef<string | null>(null);
  const candidateCountRef = useRef(0);

  useEffect(() => {
    if (!analyser) {
      setResult(null);
      smoothedFreqRef.current = null;
      displayedNoteRef.current = null;
      candidateNoteRef.current = null;
      candidateCountRef.current = 0;
      return;
    }

    let rafId: number;
    const poll = () => {
      const fftBins = analyser.getValue() as Float32Array;
      const sampleRate = Tone.getContext().sampleRate;
      const rawFreq = detectPitch(fftBins, sampleRate);

      if (!rawFreq) {
        smoothedFreqRef.current = null;
        candidateCountRef.current = 0;
        setResult(null);
        rafId = requestAnimationFrame(poll);
        return;
      }

      // Apply pitch shift offset: analyser is tapped before PitchShift,
      // so we add back the semitone shift mathematically.
      const shiftedFreq = rawFreq * Math.pow(2, pitchShiftSemitones / 12);

      // Exponential moving average for smooth needle movement
      if (smoothedFreqRef.current === null) {
        smoothedFreqRef.current = shiftedFreq;
      } else {
        smoothedFreqRef.current =
          EMA_ALPHA * shiftedFreq + (1 - EMA_ALPHA) * smoothedFreqRef.current;
      }

      const { note, cents } = freqToNoteCents(smoothedFreqRef.current);

      // Require N stable frames before switching the displayed note name
      if (note === candidateNoteRef.current) {
        candidateCountRef.current++;
      } else {
        candidateNoteRef.current = note;
        candidateCountRef.current = 1;
      }

      const displayNote =
        candidateCountRef.current >= STABLE_FRAMES
          ? note
          : (displayedNoteRef.current ?? note);

      displayedNoteRef.current = displayNote;
      setResult({ note: displayNote, cents });

      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [analyser, pitchShiftSemitones]);

  return result;
}
