import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { useAudioContext } from "../app/contexts/AudioContext";

interface WaveformProps {
  audioUrl: string; // URL of the audio file to load
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null); // Reference for the waveform container
  const waveSurferRef = useRef<WaveSurfer | null>(null); // Reference for WaveSurfer instance
  const { waveformIsPlaying } = useAudioContext();
  const [zoom, setZoom] = useState<number>(100);

  const MIN_ZOOM = 20;
  const MAX_ZOOM = 1000;

  useEffect(() => {
    // Cleanup previous wavesurfer if it exists and the audioUrl is changing
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
    }

    // Initialize a new WaveSurfer instance
    if (containerRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "blue",
        progressColor: "red",
        height: 100,
        barWidth: 0,
        backend: "WebAudio",
        normalize: true,
        dragToSeek: true,
      });

      waveSurferRef.current = wavesurfer;

      // Load the new audio
      wavesurfer.load(audioUrl);
    }

    // Cleanup function to destroy the instance when the component unmounts or audioUrl changes
    return () => {
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
      }
    };
  }, [audioUrl]); // This effect runs whenever the audioUrl changes

  // Animate the audio playback but set volume to zero so as not to double the audio output.
  useEffect(() => {
    if (waveSurferRef.current) {
      if (waveformIsPlaying && !waveSurferRef.current.isPlaying()) {
        waveSurferRef.current.setVolume(0);
        waveSurferRef.current.play();
      } else if (!waveformIsPlaying && waveSurferRef.current.isPlaying()) {
        waveSurferRef.current.pause();
        waveSurferRef.current.seekTo(0);
      }
    }
  }, [waveformIsPlaying]);

  useEffect(() => {
    const container = containerRef.current;
    let lastDistance = 0;

    const getTouchDistance = (e: TouchEvent) => {
      const [touch1, touch2] = [e.touches[0], e.touches[1]];
      const dx = touch1.clientX - touch2.clientX;
      return Math.abs(dx);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDistance = getTouchDistance(e);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent page from scrolling
        const newDistance = getTouchDistance(e);
        const delta = newDistance - lastDistance;

        // Use delta directly for zoom adjustment
        let newZoom = zoom + delta * 2; // Adjust the multiplier as needed
        newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

        setZoom(newZoom);
        waveSurferRef.current?.zoom(newZoom);
        lastDistance = newDistance; // Update for next move
      }
    };

    const onTouchEnd = () => {
      lastDistance = 0;
    };

    // Use non-passive so preventDefault works
    container?.addEventListener("touchstart", onTouchStart);
    container?.addEventListener("touchmove", onTouchMove, { passive: false });
    container?.addEventListener("touchend", onTouchEnd);

    return () => {
      container?.removeEventListener("touchstart", onTouchStart);
      container?.removeEventListener("touchmove", onTouchMove);
      container?.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoom]);

  return (
    <div
      ref={containerRef}
      className="cursor-pointer border border-gray-400 bg-white mx-10 shadow-inner shadow-slate-700"
    ></div>
  );
};

export default Waveform;
