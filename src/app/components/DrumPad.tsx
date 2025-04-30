"use client";
import { useRef, useEffect, useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import quantize from "../functions/quantize";

type DrumPadProps = {
  id: string;
  sampler: Tone.Sampler;
};

const DrumPad: React.FC<DrumPadProps> = ({ id, sampler }) => {
  const {
    transport,
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

  // update
  useEffect(() => {
    sampleDataRef.current = allSampleData[id];
  }, [allSampleData, id]);

  // Schedule playback of sampleData
  useEffect(() => {
    const sampleData = allSampleData[id];

    if (
      !loopIsPlaying ||
      allSampleData[id].events.length === 0
      // !sampleData.events[sampleData.events.length - 1].duration
    )
      return;

    const events = sampleData.events.map((event, idx) => {
      const eventTime = sampleData.settings.quantize
        ? quantize(event.startTime, sampleData.settings.quantVal)
        : event.startTime;
      console.log(`event at index: ${idx}`, event);
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
      console.log(event);
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
  }, [loopIsPlaying, sampler, transport, allSampleData, id]);

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
      // const startTime = transport.current.seconds;
      currentEvent.startTime = transport.current.seconds;
      currentEvent.duration = 0;
    }
  };

  const handleReleasePad = () => {
    setSampleIsPlaying(false);
    sampler.triggerRelease("C4");
    if (!currentEvent) return;

    const releaseTime = transport.current.seconds;

    if (loopIsPlaying && isRecording && currentEvent.duration === 0) {
      // Calculate duration, accomodating for events that overlap the transport loop boundary.

      console.log("releaseTime", releaseTime);
      console.log("currentEvent.starttime", currentEvent.startTime);
      console.log("transport.current.loopend", transport.current.loopEnd);

      currentEvent.duration =
        releaseTime > currentEvent.startTime
          ? releaseTime - currentEvent.startTime
          : transport.current.loopEnd - currentEvent.startTime + releaseTime;
      console.log("currentEvent.duration", currentEvent.duration);
      sampleDataRef.current.events.push({ ...currentEvent });
      setAllSampleData((prev) => ({ ...prev, [id]: sampleDataRef.current }));
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
