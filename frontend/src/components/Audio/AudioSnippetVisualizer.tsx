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
  const settings = allSampleData[id]?.settings;
  const { start, end, attack, release } = settings;

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

  // Compute overlay based on start/end/etc.
  const actualEnd = end ?? duration;
  const snippetStartPct = duration ? (start / duration) * 100 : 0;
  const snippetEndPct = duration ? (actualEnd / duration) * 100 : 100;
  const fadeInPct =
    actualEnd - start > 0 ? (attack / (actualEnd - start)) * 100 : 0;
  const fadeOutPct =
    actualEnd - start > 0 ? (release / (actualEnd - start)) * 100 : 0;

  return (
    <div className="relative">
      <div ref={waveformRef} />
      {duration > 0 && (
        <div
          className="absolute top-0 pointer-events-none mix-blend-multiply transition-all"
          style={{
            left: `${snippetStartPct}%`,
            width: `${snippetEndPct - snippetStartPct}%`,
            background: `linear-gradient(
              to right,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 1) ${fadeInPct}%,
              rgba(255, 255, 255, 1) ${100 - fadeOutPct}%,
              rgba(255, 255, 255, 0) 100%
            )`,
          }}
        />
      )}
    </div>
  );
};

export default AudioSnippetVisualizer;
