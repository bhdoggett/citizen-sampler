"use client";
import { useEffect, useRef } from "react";
import { drawWaveform } from "src/lib/audio/decodeAudio";
import Spinner from "../Spinner";
import styles from "./SamplePreview.module.css";

export type PreviewState = {
  peaks: Float32Array;
  duration: number;
  startedAt: number; // performance.now() when playback started
};

type SamplePreviewProps = {
  preview: PreviewState | null;
  loading: boolean;
  playing: boolean;
  onReplay: () => void;
};

// Waveform of the previewed sample with a playhead that follows playback
const SamplePreview: React.FC<SamplePreviewProps> = ({
  preview,
  loading,
  playing,
  onReplay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    drawWaveform(canvas, preview.peaks, getComputedStyle(canvas).color);
  }, [preview]);

  // Progress is written straight to a CSS variable each frame so playback
  // doesn't re-render the dialog
  useEffect(() => {
    const el = progressRef.current;
    if (!el || !preview) return;
    let frame = 0;
    const tick = () => {
      const fraction = Math.min(
        (performance.now() - preview.startedAt) / 1000 / preview.duration,
        1,
      );
      const moving = playing && fraction < 1;
      el.style.setProperty("--progress", String(moving ? fraction : 0));
      el.dataset.playing = String(moving);
      if (moving) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [preview, playing]);

  if (loading) {
    return (
      <div className={`${styles.preview} ${styles.empty}`}>
        <Spinner />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={`${styles.preview} ${styles.empty}`}>
        Select a sample to preview
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.preview}
      onClick={onReplay}
      title="Play preview again"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div ref={progressRef} className={styles.progress} data-playing="false">
        <div className={styles.played} />
        <div className={styles.playhead} />
      </div>
      <span className={styles.duration}>{preview.duration.toFixed(2)} s</span>
    </button>
  );
};

export default SamplePreview;
