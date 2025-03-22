"use client";
import { use, useEffect, useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import quantize from "../functions/quantize";
import { SampleType } from "../types/SampleType";

type DrumPadProps = {
  id: string;
  sampler: Tone.Sampler;
};

const DrumPad: React.FC<DrumPadProps> = ({ id, sampler }) => {
  // const audioCtx = useAudioContext();
  // if (!audioCtx) return null;

  const {
    transport,
    isRecording,
    isPlaying,
    quantizeValue,
    quantizeActive,
    getSampleData,
    allSampleData,
    setAllSampleData,
    setSelectedSampleId,
    selectedSampleId,
  } = useAudioContext();

  const [sampleData, setSampleData] = useState<SampleType | null>(null);
  const [isSelected, setIsSelected] = useState(false);

  // Schedule playback of sampleData
  useEffect(() => {
    if (!isPlaying || !sampleData || sampleData.times.length === 0) return;

    const bpm = transport.current.bpm.value;

    const events = sampleData.times.map((e) => {
      const eventTime = quantizeActive
        ? quantize(e.startTime, bpm, quantizeValue)
        : e.startTime;

      return [
        eventTime,
        {
          startTime: eventTime,
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

  // Sync isSelected state with selectedSampleId
  useEffect(() => {
    setIsSelected(selectedSampleId === id);
  }, [selectedSampleId, id]);

  // Update allSampleData with sampleData
  useEffect(() => {
    if (!selectedSampleId) return;

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

    setSelectedSampleId(id);
    setIsSelected(true);
    console.log("selectedSample", selectedSampleId);

    if (isPlaying && isRecording) {
      const startTime = transport.current.seconds;
      setSampleData((prevData) => ({
        ...prevData,
        times: [...prevData.times, { startTime, duration: 0 }],
      }));
    }
  };

  // const handleBlur = () => {
  //   setIsSelected(false);
  // };

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
        className="m-1 bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-20 h-20 active:bg-slate-500 shadow-md shadow-slate-700"
      >
        {id}
      </button>
    </div>
  );
};

export default DrumPad;
