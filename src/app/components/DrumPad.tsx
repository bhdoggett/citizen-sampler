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
    masterGainNode,
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
    }).connect(masterGainNode.current);

    sampler.current.volume.value = 0;

    return () => {
      sampler.current?.dispose();
      console.log("Sampler disposed");
    };
  }, [sample, masterGainNode]);

  useEffect(() => {
    if (isPlaying && sampleData.times.length > 0) {
      sampleData.times.forEach(({ startTime, duration }) => {
        if (duration) {
          Tone.Transport.schedule((time) => {
            sampler.current?.triggerAttackRelease("C4", duration, time, 1);
          }, startTime);
        }
      });
    }
  }, [isPlaying, sampleData]);

  useEffect(() => {
    setAllSampleData((prev: SampleData[]) => {
      const existingIndex = prev.findIndex((item) => item.id === sampleData.id);
      if (existingIndex !== -1) {
        const updatedData = [...prev];
        updatedData[existingIndex] = sampleData;
        return updatedData;
      } else {
        return [...prev, sampleData];
      }
    });
  }, [sampleData]);

  const handlePressPad = () => {
    if (!isLoaded || !sampler.current) return;

    sampler.current.triggerAttack("C4");
    const startTime = Tone.Transport.seconds;

    if (isPlaying && isRecording) {
      setSampleData((prevData) => {
        const newSampleData = {
          ...prevData,
          times: [...prevData.times, { startTime, duration: 0 }],
        };

        // updateSampleData(newSampleData); // Sync with context
        return newSampleData;
      });
    }

    console.log("all Sample Data:", allSampleData);
    console.log(`sampler-${sample.id}:`, sampler);
  };

  const handleReleasePad = () => {
    if (!isLoaded || !sampler.current) return;

    const releaseTime = Tone.Transport.seconds;
    sampler.current.triggerRelease("C4");

    if (isRecording && isPlaying) {
      setSampleData((prevData) => {
        const updatedTimes = prevData.times.map((t, idx, arr) =>
          idx === arr.length - 1 && t.duration === 0
            ? { ...t, duration: releaseTime - t.startTime }
            : t
        );

        const newSampleData = { ...prevData, times: updatedTimes };
        // updateSampleData(newSampleData); // Sync updated durations
        return newSampleData;
      });
    }

    console.log(`sample-${sample.id} data:`, sampleData);
    console.log(`All Sample Data:`, allSampleData);
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
