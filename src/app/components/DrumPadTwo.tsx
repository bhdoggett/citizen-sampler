"use client";
import { useEffect, useState } from "react";
import { SampleType } from "../types/SampleType";

type DrumPadProps = {
  sample: SampleType;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const [audio, setAudio] = useState<HTMLAudioElement>(null);
  const [sampleStart, setSampleStart] = useState<number>(0);

  useEffect(() => {
    const newAudio = new Audio(sample.audioUrl);

    const handleMetadata = () => {
      if (newAudio.duration && newAudio.duration > 1) {
        const randomStart = Math.random() * (newAudio.duration - 1);
        setSampleStart(randomStart);
        console.log("random start is at second:", randomStart);
      }
    };

    newAudio.preload = "auto";
    newAudio.addEventListener("loadedmetadata", handleMetadata);

    setAudio(newAudio);

    return () => {
      newAudio.removeEventListener("loadedmetadata", handleMetadata);
    };
  }, [sample.audioUrl]);

  const handlePressPad = () => {
    if (!audio || isNaN(audio.duration)) {
      console.error("Audio not loaded yet or has invalid duration.");
      return;
    }
    audio.currentTime = sampleStart;
    audio.play();
  };

  const handleReleasePad = () => {
    audio.pause();
    audio.currentTime = sampleStart;
  };

  return (
    <div>
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className="bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-14 h-14"
      >
        {sample.duration}
      </button>
    </div>
  );
};

export default DrumPad;
