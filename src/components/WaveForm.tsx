import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAudioContext } from "@/app/contexts/AudioContext";

interface WaveformProps {
  audioUrl: string; // URL of the audio file to load
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const waveformRef = useRef<HTMLDivElement>(null); // Reference for the waveform container
  const wavesurferRef = useRef<WaveSurfer | null>(null); // Reference for WaveSurfer instance
  const { waveformIsPlaying, setWaveformIsPlaying } = useAudioContext();

  useEffect(() => {
    // if (!wavesurferRef.current) return;

    // Cleanup previous wavesurfer if it exists and the audioUrl is changing
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Initialize a new WaveSurfer instance
    if (waveformRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "violet",
        progressColor: "purple",
        height: 100,
        barWidth: 3,
        backend: "WebAudio",
        normalize: true,
      });

      wavesurferRef.current = wavesurfer;

      // Load the new audio
      wavesurfer.load(audioUrl);

      // Event listeners for play/pause toggling
      wavesurfer.on("play", () => setWaveformIsPlaying(true));
      wavesurfer.on("pause", () => setWaveformIsPlaying(false));
    }

    // Cleanup function to destroy the instance when the component unmounts or audioUrl changes
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl, setWaveformIsPlaying]); // This effect runs whenever the audioUrl changes

  useEffect(() => {
    if (wavesurferRef.current) {
      if (waveformIsPlaying && !wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.play();
      } else if (!waveformIsPlaying && wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.pause();
        wavesurferRef.current.seekTo(0);
      }
    }
  }, [waveformIsPlaying]);

  return (
    <div>
      <div ref={waveformRef}></div>{" "}
      {/* This is where the waveform will be rendered */}
      <button>{waveformIsPlaying ? "Pause" : "Play"}</button>
    </div>
  );
};

export default Waveform;
