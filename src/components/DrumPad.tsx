"use client";
import { useRef, useEffect, useState } from "react";
import { useAudioContext } from "@/app/contexts/AudioContext";
import * as Tone from "tone";
import quantize from "@/app/functions/quantize";

type DrumPadProps = {
  id: string;
  sampler: Tone.Sampler;
};

const DrumPad: React.FC<DrumPadProps> = ({ id, sampler }) => {
  const {
    isRecording,
    loopIsPlaying,
    allSampleData,
    setAllSampleData,
    setSelectedSampleId,
    selectedSampleId,
    samplersRef,
  } = useAudioContext();

  const sampleDataRef = useRef(allSampleData[id]);
  const { currentEvent } = samplersRef.current[id];
  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);

  // Update this component's sampleDataRef when allSampleData state changes
  useEffect(() => {
    sampleDataRef.current = allSampleData[id];
  }, [allSampleData, id]);

  // Schedule playback of sampleData
  useEffect(() => {
    const sampleData = allSampleData[id];

    if (!loopIsPlaying || allSampleData[id].events.length === 0) return;

    const events = sampleData.events.map((event) => {
      if (!event.startTime) return;
      const startTimeInSeconds = Tone.Ticks(event.startTime).toSeconds();
      const eventTime = sampleData.settings.quantize
        ? quantize(startTimeInSeconds, sampleData.settings.quantVal)
        : startTimeInSeconds;
      // console.log(`event at index: ${idx}`, event);
      return [
        eventTime,
        {
          startTime: eventTime,
          duration: event.duration,
          note: event.note,
          // velocity: event.velocity,
        },
      ];
    });

    const part = new Tone.Part((time, event) => {
      if (
        typeof event === "object" &&
        event !== null &&
        "duration" in event &&
        event.duration !== null
      ) {
        // const pitchShift = allSampleData[id].settings.pitchShift;
        // const note = Tone.Frequency(event.note).transpose(pitchShift).toNote();
        sampler.triggerAttackRelease(event.note, event.duration, time);
        setSampleIsPlaying(true);
        setTimeout(() => {
          setSampleIsPlaying(false);
        }, event.duration * 1000);
        console.log(event);
      }
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
  }, [loopIsPlaying, sampler, allSampleData, id]);

  // Sync isSelected state with selectedSampleId
  useEffect(() => {
    setIsSelected(selectedSampleId === id);
  }, [selectedSampleId, id]);

  const handlePressPad = () => {
    sampler.triggerAttack("C4");
    setSelectedSampleId(id);
    setIsSelected(true);
    setSampleIsPlaying(true);
    console.log("allSampleData", allSampleData);
    console.log("samplerRef", samplersRef.current);

    if (loopIsPlaying && isRecording) {
      currentEvent.startTime = Tone.getTransport().ticks;
      currentEvent.duration = 0;
    }
  };

  const handleReleasePad = () => {
    setSampleIsPlaying(false);
    sampler.triggerRelease("C4");

    if (
      // !currentEvent ||
      !currentEvent.startTime ||
      !loopIsPlaying ||
      !isRecording
    )
      return;

    const releaseTime = Tone.getTransport().seconds;
    const startTimeInSeconds = Tone.Ticks(currentEvent.startTime).toSeconds();

    currentEvent.duration =
      releaseTime > startTimeInSeconds
        ? releaseTime - startTimeInSeconds
        : Tone.Time(Tone.getTransport().loopEnd).toSeconds() -
          startTimeInSeconds +
          releaseTime;
    console.log("currentEvent.duration", currentEvent.duration);
    sampleDataRef.current.events.push({ ...currentEvent });
    setAllSampleData((prev) => ({ ...prev, [id]: sampleDataRef.current }));

    if (loopIsPlaying && isRecording && currentEvent.duration === 0) {
    }
  };

  const handleFocus = () => {
    setSelectedSampleId(id);
  };

  const getPadColor = () => {
    if (allSampleData[id].settings.mute) return "bg-red-400";
    if (allSampleData[id].settings.solo) return "bg-yellow-200";
    return "bg-slate-400";
  };

  const getActiveStyle = () => {
    return sampleIsPlaying
      ? "brightness-75 saturate-150 transition-all duration-100"
      : "brightness-100 saturate-100 transition-all duration-300";
  };

  return (
    <div
      className={`${isSelected ? "border-2 border-blue-600" : "border-2 border-transparent"} rounded-sm`}
      onFocus={handleFocus}
    >
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onMouseLeave={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className={`${getActiveStyle()} ${getPadColor()} m-1 border-4 border-slate-800  focus:border-double w-32 h-32 shadow-md shadow-slate-700  `}
      >
        {id}
      </button>
    </div>
  );
};

export default DrumPad;
