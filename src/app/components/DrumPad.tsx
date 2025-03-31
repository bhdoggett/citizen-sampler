"use client";
import { useRef, useEffect, useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import quantize from "../functions/quantize";
import { SampleType, SampleEvent } from "../types/SampleType";

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
  } = useAudioContext();

  const sampleDataRef = useRef(allSampleData[id]);

  // keep track of sample play events one at a time
  const eventRef = useRef<SampleEvent | null>(null);
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

    const events = sampleData.events.map((event) => {
      const eventTime = sampleData.settings.quantize
        ? quantize(event.startTime, sampleData.settings.quantVal)
        : event.startTime;
      console.log("sampleData.settings.quantize", sampleData.settings.quantize);
      console.log(event);
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

    if (loopIsPlaying && isRecording) {
      // const startTime = transport.current.seconds;
      eventRef.current = { startTime: transport.current.seconds, duration: 0 };
    }
  };

  const handleReleasePad = () => {
    setSampleIsPlaying(false);
    sampler.triggerRelease("C4");

    if (!eventRef.current) return;

    const releaseTime = transport.current.seconds;

    if (loopIsPlaying && isRecording && eventRef.current.duration === 0) {
      // Calculate duration. Accomodate for events that overlap the transport loop boundary.
      eventRef.current.duration =
        releaseTime > eventRef.current.startTime
          ? releaseTime - eventRef.current.startTime
          : transport.current.loopend -
            eventRef.current.startTime +
            releaseTime;
      sampleDataRef.current.events.push({ ...eventRef.current });
      setAllSampleData((prev) => ({ ...prev, [id]: sampleDataRef.current }));
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
        className={`${sampleIsPlaying ? "bg-slate-500" : "bg-slate-400"} m-1 border border-slate-800 rounded-sm focus:border-double w-20 h-20 shadow-md shadow-slate-700  `}
      >
        {id}
      </button>
    </div>
  );
};

export default DrumPad;
