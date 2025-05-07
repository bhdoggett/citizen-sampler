import { useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";

export function useWaveAnimations() {
  const animationRef = useRef<number | null>(null);

  const startAnimation = useCallback((wavesurfer: WaveSurfer) => {
    const duration = wavesurfer.getDuration();
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      wavesurfer.seekTo(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const stopAndResetAnimation = useCallback((wavesurfer: WaveSurfer) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    wavesurfer.seekTo(0);
  }, []);

  return {
    startAnimation,
    stopAndResetAnimation,
  };
}
