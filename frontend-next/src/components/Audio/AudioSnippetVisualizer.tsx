import React, { useEffect, useRef } from "react";
import {
  decodeAudioUrl,
  extractPeaks,
  drawWaveform,
} from "../../lib/audio/decodeAudio";
import styles from "./AudioSnippetVisualizer.module.css";

type AudioSnippetVisualizerProps = {
  url: string;
};

const AudioSnippetVisualizer: React.FC<AudioSnippetVisualizerProps> = ({
  url,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    decodeAudioUrl(url)
      .then((buffer) => {
        if (cancelled || !canvas) return;
        const peaks = extractPeaks(buffer, canvas.clientWidth || 100, false);
        drawWaveform(canvas, peaks, getComputedStyle(canvas).color);
      })
      .catch(console.warn);
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <canvas ref={canvasRef} className={styles.canvas} />
  );
};

export default AudioSnippetVisualizer;
