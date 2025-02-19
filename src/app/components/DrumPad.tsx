"use client";
import { useEffect, useRef, useState } from "react";
import { SampleType } from "../types/SampleType";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import { Subdivision, TransportTime } from "tone/build/esm/core/type/Units";
import type { SampleData } from "../types/SampleData";

type DrumPadProps = {
  sample: SampleType;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const {
    masterGain,
    isRecording,
    isPlaying,
    quantizeRecordActive,
    quantizeSetting,
    allSampleData,
    setAllSampleData,
  } = useAudioContext();

  const sampler = useRef<Tone.Sampler | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sampleData, setSampleData] = useState<SampleData>({
    id: sample.id,
    url: sample.audioUrl || "",
    times: [],
  });

  useEffect(() => {
    if (!sample.audioUrl) return;

    sampler.current = new Tone.Sampler({
      urls: { C4: sample.audioUrl },
      attack: 0.1, // Adjust the attack time (default is 0.1)
      release: 0.1, // Adjust the release time (default is 0.5)
      onload: () => setIsLoaded(true),
      onerror: (error) => {
        console.error("Error loading sample:", error);
        setIsLoaded(false);
      },
    }).connect(masterGain);

    return () => {
      sampler.current?.dispose();
      console.log("Sampler disposed");
    };
  }, [sample]);

  useEffect(() => {
    if (isPlaying && sampleData.times.length > 0) {
      sampleData.times.forEach(({ startTime, duration }) => {
        if (duration) {
          Tone.Transport.schedule((time) => {
            sampler.current?.triggerAttackRelease("C4", duration, time);
          }, startTime);
        }
      });
    }
  }, [isPlaying, sampleData]);

  useEffect(() => {
    if (!isPlaying && sampler.current) {
      sampler.current.triggerRelease("C4");
    }
  }, [isPlaying]);

  const handlePressPad = () => {
    if (!isLoaded || !sampler.current) return;

    const startTime = Tone.Transport.seconds;
    sampler.current.triggerAttack("C4");

    if (isRecording) {
      setSampleData((prevData) => ({
        ...prevData,
        times: [...prevData.times, { startTime, duration: 0 }], // Ensure times array exists
      }));
    }
  };

  const handleReleasePad = () => {
    if (!isLoaded || !sampler.current) return;

    const releaseTime = Tone.Transport.seconds;
    sampler.current.triggerRelease("C4");

    if (isRecording) {
      setSampleData((prevData) => ({
        ...prevData,
        times: prevData.times.map((t, idx, arr) =>
          idx === arr.length - 1 && t.duration === 0
            ? { ...t, duration: releaseTime - t.startTime }
            : t
        ),
      }));
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
        disabled={!isLoaded}
      >
        {isLoaded ? sample.label : "Loading..."}
      </button>
    </div>
  );
};

export default DrumPad;
