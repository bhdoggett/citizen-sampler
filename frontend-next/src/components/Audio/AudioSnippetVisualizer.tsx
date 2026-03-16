import React, { useEffect, useRef } from "react";
import {
  decodeAudioUrl,
  extractPeaks,
  drawWaveform,
} from "../../lib/audio/decodeAudio";

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
        drawWaveform(canvas, peaks, "#ccc");
      })
      .catch(console.warn);
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="relative w-full mt-2" style={{ minHeight: "1px" }}>
      <canvas ref={canvasRef} className="w-full" style={{ height: 20 }} />
    </div>
  );
};

export default AudioSnippetVisualizer;
