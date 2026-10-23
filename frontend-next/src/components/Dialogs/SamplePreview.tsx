"use client";
import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { drawWaveform } from "src/lib/audio/decodeAudio";
import styles from "./SamplePreview.module.css";

export type PreviewState = {
  peaks: Float32Array;
  duration: number;
  startedAt: number; // Tone.now() when playback started
};

type SamplePreviewProps = {
  preview: PreviewState | null;
  isPlaying: () => boolean;
  onReplay: () => void;
};

// Waveform of the previewed sample with a playhead that follows playback
const SamplePreview: React.FC<SamplePreviewProps> = ({
  preview,
  isPlaying,
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
        (Tone.now() - preview.startedAt) / preview.duration,
        1,
      );
      const playing = isPlaying() && fraction < 1;
      el.style.setProperty("--progress", String(playing ? fraction : 0));
      el.dataset.playing = String(playing);
      if (playing) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [preview, isPlaying]);

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
