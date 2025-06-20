import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAudioContext } from "../../app/contexts/AudioContext";

type AudioSnippetVisualizerProps = {
  id: string;
};

const AudioSnippetVisualizer: React.FC<AudioSnippetVisualizerProps> = ({
  id,
}) => {
  const { allSampleData } = useAudioContext();
  const url = allSampleData[id]?.url;

  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [duration, setDuration] = useState(0);

  // (Re)load waveform on URL change
  useEffect(() => {
    if (!url || !waveformRef.current) return;

    // Destroy old instance
    wavesurferRef.current?.destroy();

    // Create new instance
    const wave = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#ccc",
      progressColor: "#ccc",
      cursorWidth: 0,
      height: 20,
      normalize: false,
    });

    wavesurferRef.current = wave;
    wave.load(url);

    wave.on("ready", () => {
      setDuration(wave.getDuration());
    });

    return () => {
      wave.destroy();
    };
  }, [url]);

  return (
    <div className="relative w-full" style={{ minHeight: "1px" }}>
      <div ref={waveformRef} className="w-full" />
      {duration > 0 && (
        <div
          className="absolute top-0 pointer-events-none transition-all"
          style={
            {
              height: "100%",
              mixBlendMode: "multiply",
              WebkitMixBlendMode: "multiply",
              transform: "translateZ(0)", // Force hardware acceleration on Safari
              WebkitTransform: "translateZ(0)",
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );
};

export default AudioSnippetVisualizer;
