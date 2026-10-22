import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { useAudioContext } from "src/app/contexts/AudioContext";
import type { CSSProperties } from "react";
import styles from "./LoopProgress.module.css";

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
    <div
      className={styles.track}
      style={{ "--progress": progress } as CSSProperties}
    >
      <div className={styles.fill} />
    </div>
  );
};

export default LoopProgressBar;
