"use client";

import { useRef } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { CustomSampler } from "../../types/CustomSampler";

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
    const { start, end } = allSampleData[selectedSampleId].settings;
    console.log(allSampleData[selectedSampleId]);
    console.log("From PitchPad: start", start, "end", end);
    console.log("allSampleData", allSampleData);

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

  const handleRelease = () => {
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    sampler.triggerRelease(note, Tone.now());

    if (!currentEvent.startTime || !loopIsPlaying || !isRecording) return;

    const padReleasetime = Tone.getTransport().seconds;
    const sampleEnd = allSampleData[selectedSampleId].settings.end;

    const actualReleaseTime = sampleEnd
      ? padReleasetime < sampleEnd
        ? padReleasetime
        : sampleEnd
      : padReleasetime;

    const startTimeInSeconds = Tone.Ticks(currentEvent.startTime).toSeconds();
    const loopEndInSeconds = Tone.Time(Tone.getTransport().loopEnd).toSeconds();

    currentEvent.duration =
      actualReleaseTime > startTimeInSeconds
        ? actualReleaseTime - startTimeInSeconds
        : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;

    console.log("currentEvent.duration", currentEvent.duration);

    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: {
        ...prev[selectedSampleId],
        events: {
          ...prev[selectedSampleId].events,
          [currentLoop]: [
            ...(prev[selectedSampleId].events[currentLoop] || []),
            { ...currentEvent },
          ],
        },
      },
    }));
  };

  return (
    <button
      onMouseDown={() => handlePress()}
      onTouchStart={() => handlePress()}
      onMouseUp={() => handleRelease()}
      onMouseLeave={() => handleRelease()}
      onTouchEnd={() => handleRelease()}
      className={`border border-black text-sm cursor-pointer aspect-square ${note === baseNote ? "bg-slate-400" : "bg-slate-300"}`}
    >
      {note}
    </button>
  );
};

export default PitchPad;
