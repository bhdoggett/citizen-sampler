"use client";
import { useEffect, useRef, useState } from "react";
import { SampleType } from "../types/SampleType";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";

type DrumPadProps = {
  sample: SampleType;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const { masterGain } = useAudioContext();
  const playerRef = useRef<Tone.Player | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Track whether the sample is loaded

  useEffect(() => {
    if (!sample.audioUrl) return;

    // Create and load the sample
    const player = new Tone.Player({
      url: sample.audioUrl,
      autostart: false,
      onload: () => {
        console.log(`Sample loaded: ${sample.title}`);
        setIsLoaded(true); // Mark as loaded
      },
      onerror: (error) => {
        console.error("Error loading sample:", error);
        setIsLoaded(false);
      },
    }).connect(masterGain);

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        console.log("Player disposed");
      }
    };
  }, [sample.audioUrl]);

  const handlePressPad = () => {
    if (!isLoaded) {
      console.warn("Sample not loaded yet!");
      return;
    }

    if (playerRef.current) {
      playerRef.current.start();
      console.log("Player started");
    }
  };

  const handleReleasePad = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      console.log("Player stopped");
    }
  };

  return (
    <div>
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className="bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-14 h-14 active:bg-slate-500"
        disabled={!isLoaded} // Disable button until sample loads
      >
        {isLoaded ? sample.label : "Loading..."}
      </button>
    </div>
  );
};

export default DrumPad;
