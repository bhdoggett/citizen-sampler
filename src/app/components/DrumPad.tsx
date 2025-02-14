"use client";
import { useEffect, useState } from "react";
import { SampleType } from "../types/SampleType";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";

type DrumPadProps = {
  sample: SampleType;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const { playSample, masterGain } = useAudioContext();
  const [gainNode, _] = useState(() => new Tone.Gain(1).connect(masterGain)); // Create and connect Gain
  const [player, setPlayer] = useState<Tone.Player | null>(null);

  useEffect(() => {
    return () => {
      gainNode.disconnect(); // Cleanup gain node when component unmounts
    };
  }, []);

  const handlePressPad = async () => {
    if (!sample.audioUrl) return;

    const newPlayer = await playSample(sample.audioUrl, gainNode);
    setPlayer(newPlayer);
  };

  const handleReleasePad = () => {
    if (player) {
      player.stop();
      setPlayer(null);
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
      >
        {sample.label}
      </button>
    </div>
  );
};

export default DrumPad;
