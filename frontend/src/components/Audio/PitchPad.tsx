"use client";
import * as Tone from "tone";
import { useState, useRef } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { CustomSampler } from "../../types/CustomSampler";
import { Frequency } from "tone/build/esm/core/type/Units";

type PitchPadProps = {
  note: string;
  sampler: CustomSampler;
};

const PitchPad: React.FC<PitchPadProps> = ({ note, sampler }) => {
  const {
    selectedSampleId,
    allSampleData,
    setAllSampleData,
    samplersRef,
    loopIsPlaying,
    isRecording,
    currentLoop,
  } = useAudioContext();
  const sampleDataRef = useRef(allSampleData[selectedSampleId]);
  const currentEvent = samplersRef.current[selectedSampleId]?.currentEvent;
  const { baseNote } = allSampleData[selectedSampleId].settings;
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);

  const handlePress = () => {
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const now = Tone.now();
    const { start, end } = sampleDataRef.current.settings;

    hasReleasedRef.current = false;
    sampler.triggerAttack(note, now, start, 1);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(note, Tone.now());
        }
      }, duration * 1000);
    }

    if (loopIsPlaying && isRecording) {
      currentEvent.startTime = Tone.getTransport().ticks;
      currentEvent.duration = 0;
      currentEvent.note = note;
    }
  };

  const handleRelease = (note: Frequency) => {
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    sampler.triggerRelease(note, Tone.now());

    if (
      // !currentEvent ||
      !currentEvent.startTime ||
      !loopIsPlaying ||
      !isRecording
    )
      return;

    const padReleasetime = Tone.getTransport().seconds;
    const sampleEnd = allSampleData[selectedSampleId].settings.end;

    const actualReleaseTime = sampleEnd
      ? padReleasetime < sampleEnd
        ? padReleasetime
        : sampleEnd
      : padReleasetime;

    const startTimeInSeconds = Tone.Ticks(currentEvent.startTime).toSeconds();

    currentEvent.duration =
      actualReleaseTime > startTimeInSeconds
        ? actualReleaseTime - startTimeInSeconds
        : Tone.Time(Tone.getTransport().loopEnd).toSeconds() -
          startTimeInSeconds +
          actualReleaseTime;

    console.log("currentEvent.duration", currentEvent.duration);
    sampleDataRef.current.events[currentLoop].push({ ...currentEvent });
    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: sampleDataRef.current,
    }));

    if (loopIsPlaying && isRecording && currentEvent.duration === 0) {
    }
  };

  return (
    <button
      onMouseDown={() => handlePress(note)}
      onTouchStart={() => handlePress(note)}
      onDragOver={() => handlePress(note)}
      onMouseUp={() => handleRelease(note)}
      onMouseLeave={() => handleRelease(note)}
      onTouchEnd={() => handleRelease(note)}
      className={`border border-black text-sm cursor-pointer aspect-square ${note === baseNote ? "bg-slate-400" : "bg-slate-300"}`}
    >
      {note}
    </button>
  );
};

export default PitchPad;
