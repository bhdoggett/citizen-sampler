import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAudioContext } from "@/app/contexts/AudioContext";

type AudioSnippetVisualizerProps = {
  id: string;
};

const AudioSnippetVisualizer: React.FC<AudioSnippetVisualizerProps> = ({
  id,
}) => {
  const { allSampleData } = useAudioContext();
  const { url } = allSampleData[id];
  const { start, end, attack, release } = allSampleData[id].settings;
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!url || !waveformRef.current) return;

    // wavesurferRef.current?.destroy();

    wavesurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#ccc",
      progressColor: "#ccc",
      cursorWidth: 0,
      height: 100,
      normalize: false,
    });

    wavesurferRef.current.load(url);

    wavesurferRef.current.on("ready", () => {
      const dur = wavesurferRef.current!.getDuration();
      setDuration(dur);
    });

    return () => wavesurferRef.current?.destroy();
  }, [url]);

  const actualEnd = end ?? duration;

  const snippetStartPct = (start / duration) * 100 || 0;
  const snippetEndPct = (actualEnd / duration) * 100 || 100;
  const fadeInPct = (attack / (actualEnd - start)) * 100 || 0;
  const fadeOutPct = (release / (actualEnd - start)) * 100 || 0;

  return (
    <div className="relative">
      <div ref={waveformRef} />
      <div
        className="absolute top-0 h-full pointer-events-none mix-blend-multiply"
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
    </div>
  );
};

export default AudioSnippetVisualizer;
