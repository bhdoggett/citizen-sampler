import { useEffect, useRef, useState } from "react";
import { createPitchSmoother, type PitchResult } from "src/lib/audio/pitchDetection";
import { useEnginePitch } from "src/lib/engine/react";

// The tuner reading for a pad. The engine sends raw frequencies; this smooths
// them for display.
export function usePitchDetector(
  padId: string,
  pitchShiftSemitones: number = 0
): PitchResult | null {
  const reading = useEnginePitch(padId);
  const [result, setResult] = useState<PitchResult | null>(null);
  // Smoothing state carried from one reading to the next
  const smootherRef = useRef(createPitchSmoother());

  // Start fresh for each pad
  useEffect(() => {
    smootherRef.current = createPitchSmoother();
    setResult(null);
  }, [padId]);

  useEffect(() => {
    setResult(smootherRef.current.step(reading?.frequency ?? null, pitchShiftSemitones));
  }, [reading, pitchShiftSemitones]);

  return result;
}
