import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { useAudioContext } from "src/app/contexts/AudioContext";

const LoopProgressBar = () => {
  const { allLoopSettings, loopIsPlaying } = useAudioContext();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updateProgress = () => {
      const transport = Tone.getTransport();
      const loopEndSeconds = Tone.Time(transport.loopEnd).toSeconds();
      const current = transport.seconds % loopEndSeconds;
      setProgress(current / loopEndSeconds);
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    rafRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [allLoopSettings]);

  useEffect(() => {
    if (!loopIsPlaying) rafRef.current = null;
  });
  return (
    <div className="w-full h-2 bg-gray-300 overflow-hidden mt-2">
      <div
        className="h-full bg-slate-600 transition-none"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
};

export default LoopProgressBar;
