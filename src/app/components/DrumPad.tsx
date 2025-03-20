"use client";
import { useEffect, useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import quantize from "../functions/quantize";

type DrumPadProps = {
  id?: string;
  sampler: Tone.Sampler;
};

const DrumPad: React.FC<DrumPadProps> = ({ id, sampler }) => {
  const {
    transport,
    isRecording,
    isPlaying,
    quantizeValue,
    quantizeActive,
    getSampleData,
    allSampleData,
    setAllSampleData,
    setSelectedSample,
    selectedSample,
  } = useAudioContext() || {};

  const [sampleData, setSampleData] = useState(
    allSampleData.find((sample) => sample.id === id) || {
      title: "",
      label: "",
      type: "",
      url: "",
      id: "",
      times: [],
      settings: {
        volume: 0,
        pan: 0,
        pitch: 0,
        finetune: 0,
        attack: 0,
        release: 0,
        highpass: [0, "highpass"],
        lowpass: [20000, "lowpass"],
      },
    }
  );
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    if (!isPlaying || sampleData.times.length === 0) return;

    const bpm = transport.current.bpm.value;

    const events = sampleData.times.map((e) => {
      const quantizedTime = quantizeActive
        ? quantize(e.startTime, bpm, quantizeValue)
        : e.startTime;

      return [
        quantizedTime,
        {
          startTime: quantizedTime,
          duration: e.duration,
        },
      ];
    });

    const part = new Tone.Part((time, event) => {
      sampler.triggerAttackRelease("C4", event.duration, time);
    }, events);

    part.start(0);

    const disposePart = () => {
      if (part) {
        try {
          if (part.state === "started") {
            part.stop();
          }
          part.dispose();
        } catch (error) {
          console.warn("Error disposing part:", error);
        }
      }
    };

    return () => {
      disposePart();
    };
  }, [
    isPlaying,
    sampleData,
    quantizeActive,
    quantizeValue,
    sampler,
    transport,
  ]);

  useEffect(() => {
    setAllSampleData((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === sampleData.id);
      if (existingIndex !== -1) {
        const updatedData = [...prev];
        updatedData[existingIndex] = sampleData;
        return updatedData;
      } else {
        return [...prev, sampleData];
      }
    });
  }, [sampleData, setAllSampleData]);

  const handlePressPad = () => {
    sampler.triggerAttack("C4");

    setSelectedSample(sampleData);
    setIsSelected(true);
    console.log("selectedSample", selectedSample);

    if (isPlaying && isRecording) {
      const startTime = transport.current.seconds;
      setSampleData((prevData) => ({
        ...prevData,
        times: [...prevData.times, { startTime, duration: 0 }],
      }));
    }
  };

  const handleBlur = () => {
    setIsSelected(false);
  };

  const handleReleasePad = () => {
    const releaseTime = transport.current.seconds;
    sampler.triggerRelease("C4");

    if (isRecording && isPlaying) {
      setSampleData((prevData) => {
        const updatedTimes = prevData.times.map((t, i, arr) => {
          if (
            i === arr.length - 1 &&
            t.duration === 0 &&
            releaseTime > t.startTime
          ) {
            return { ...t, duration: releaseTime - t.startTime };
          }
          return t;
        });

        return { ...prevData, times: updatedTimes };
      });
    }
  };

  return (
    <div
      className={`${isSelected ? "border-2 border-blue-600" : "border-2 border-transparent"} rounded-sm`}
    >
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onMouseLeave={handleReleasePad}
        onTouchEnd={handleReleasePad}
        onBlur={handleBlur}
        className="m-1 bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-20 h-20 active:bg-slate-500 shadow-md shadow-slate-700"
      >
        {id}
      </button>
    </div>
  );
};

export default DrumPad;
