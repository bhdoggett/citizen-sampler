"use client";
import { use, useEffect, useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import quantize from "../functions/quantize";
import { SampleType, SampleEvent } from "../types/SampleType";

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
    loopIsPlaying,
    quantizeValue,
    quantizeActive,
    // getSampleData,
    allSampleData,
    setAllSampleData,
    setSelectedSampleId,
    selectedSampleId,
    q,
  } = useAudioContext();

  const [sampleData, setSampleData] = useState<SampleType | null>(
    allSampleData[id]
  );
  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);

  // //test some things
  // useEffect(() => {
  //   console.log("sample data", sampleData);
  //   console.log("all sample data at id", allSampleData[id]);
  // }, [sampleData, allSampleData, selectedSampleId]);

  // useEffect(() => {
  //   console.log("sampleIsPlaying:", sampleIsPlaying);
  // }, [sampleIsPlaying]);

  // // Load sample data
  // useEffect(() => {
  //   if (!selectedSampleId) return;

  //   setSampleData(allSampleData[selectedSampleId]?.sampleData || null);
  // });

  // Schedule playback of sampleData
  useEffect(() => {
    if (
      !loopIsPlaying ||
      !sampleData ||
      sampleData.events.length === 0 ||
      !sampleData.events[sampleData.events.length - 1].duration
    )
      return;

    const bpm = transport.current.bpm.value;

    const events = sampleData?.events.map((event) => {
      const eventTime = quantizeActive
        ? quantize(event.startTime, bpm, quantizeValue)
        : event.startTime;

      return [
        eventTime,
        {
          startTime: eventTime,
          duration: event.duration,
        },
      ];
    });

    const part = new Tone.Part((time, event) => {
      sampler.triggerAttackRelease("C4", event.duration, time);
      setSampleIsPlaying(true);
      setTimeout(() => {
        setSampleIsPlaying(false);
      }, event.duration * 1000);
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
    loopIsPlaying,
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

  // // Update allSampleData with sampleData
  // useEffect(() => {
  //   if (!selectedSampleId) return;

  //   setAllSampleData((prev) => {
  //     const existingIndex = prev.findIndex((item) => item.id === sampleData.id);
  //     if (existingIndex !== -1) {
  //       const updatedData = [...prev];
  //       updatedData[existingIndex] = sampleData;
  //       return updatedData;
  //     } else {
  //       return [...prev, sampleData];
  //     }
  //   });
  // }, [sampleData, setAllSampleData]);

  // Update allSampleData with sampleData
  useEffect(() => {
    setAllSampleData((prev) => ({
      ...prev,
      [id]: sampleData,
    }));
  }, [sampleData, setAllSampleData]);

  // useEffect(() => {
  //   if (
  //     !allSampleData[selectedSampleId] ||
  //     allSampleData[selectedSampleId] === sampleData
  //   )
  //     return;

  //   const handler = setTimeout(() => {
  //     // Update global state
  //     setAllSampleData((prev) => ({
  //       ...prev,
  //       [selectedSampleId]: { ...prev[selectedSampleId], sampleData },
  //     }));

  //     console.log("all sample data", allSampleData);
  //   }, 500);

  //   return () => {
  //     clearTimeout(handler); // cancel if settings change before debounceDelay
  //   };
  // }, [allSampleData, sampleData, setAllSampleData]);

  const handlePressPad = () => {
    sampler.triggerAttack("C4");
    setSelectedSampleId(id);
    setIsSelected(true);
    setSampleIsPlaying(true);

    if (loopIsPlaying && isRecording) {
      const startTime = transport.current.seconds;

      setSampleData((prevData) => ({
        ...prevData,
        events: [...(prevData?.events || []), { startTime, duration: 0 }],
      }));
    }
  };

  const handleReleasePad = () => {
    setSampleIsPlaying(false);
    sampler.triggerRelease("C4");
    const releaseTime = transport.current.seconds;

    if (loopIsPlaying && isRecording && sampleData) {
      setSampleData((prevData) => {
        const updatedTimes = prevData?.events.map(
          (time: SampleEvent, idx, arr) => {
            if (
              idx === arr.length - 1 &&
              time.duration === 0 &&
              releaseTime > time.startTime
            ) {
              return { ...time, duration: releaseTime - time.startTime };
            }
            return time;
          }
        );

        return {
          ...prevData,
          events: updatedTimes,
        };
      });
    }

    console.log(`sample ${id} data`, sampleData);
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
        className={`${sampleIsPlaying ? "bg-slate-500" : "bg-slate-400"} m-1 border border-slate-800 rounded-sm focus:border-double w-20 h-20 shadow-md shadow-slate-700  `}
      >
        {id}
      </button>
    </div>
  );
};

export default DrumPad;
