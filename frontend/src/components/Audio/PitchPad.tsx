"use client";

import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { CustomSampler } from "../../types/CustomSampler";
import quantize from "frontend/src/app/functions/quantize";

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
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  const [pitchIsPlaying, setPitchIsPlaying] = useState<boolean>(false);

  const handlePress = () => {
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const currentEvent = samplersRef.current[selectedSampleId]?.currentEvent;

    if (!currentEvent) return;

    const now = Tone.now();
    const { start, end } = allSampleData[selectedSampleId].settings;
    console.log(allSampleData[selectedSampleId]);
    console.log("From PitchPad: start", start, "end", end);
    console.log("allSampleData", allSampleData);

    hasReleasedRef.current = false;
    sampler.triggerAttack(note, now, start, 1);
    setPitchIsPlaying(true);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(note, Tone.now());
          setPitchIsPlaying(false);
        }
      }, duration * 1000);
    }
    currentEvent.startTime = Tone.getTransport().ticks;
    currentEvent.duration = 0;
    currentEvent.note = note;
    // if (loopIsPlaying && isRecording) {

    // }
  };

  const handleRelease = () => {
    if (!sampler) return;
    const currentEvent = samplersRef.current[selectedSampleId]?.currentEvent;
    if (!currentEvent) return; // safety

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    setPitchIsPlaying(false);
    sampler.triggerRelease(note, Tone.now());

    if (!currentEvent.startTime) return;

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

    console.log("startTime", startTimeInSeconds);
    console.log("loopEnd", loopEndInSeconds);
    console.log("actualReleaseTime", actualReleaseTime);
    console.log("currentEvent.duration", currentEvent.duration);

    if (!loopIsPlaying || !isRecording) return;
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

  const getActiveStyle = () => {
    return pitchIsPlaying
      ? "brightness-75 saturate-500 transition-all duration-100"
      : "brightness-100 saturate-100 transition-all duration-100";
  };

  // Schedule playback of events, strictly for visual render feedback on the PitchPad
  useEffect(() => {
    const sampleData = allSampleData[selectedSampleId];

    if (
      !loopIsPlaying ||
      allSampleData[selectedSampleId].events[currentLoop].length === 0
    )
      return;

    const events = sampleData.events[currentLoop]
      .filter((event) => event.note === note)
      .map((event) => {
        if (!event.startTime) return;
        const startTimeInSeconds = Tone.Ticks(event.startTime).toSeconds();
        const eventTime = sampleData.settings.quantize
          ? quantize(startTimeInSeconds, sampleData.settings.quantVal)
          : startTimeInSeconds;
        return [
          eventTime,
          {
            startTime: eventTime,
            duration: event.duration,
          },
        ];
      });

    const part = new Tone.Part((time, event) => {
      if (!sampler) return;
      const { start, end } = allSampleData[selectedSampleId].settings;
      if (
        typeof event === "object" &&
        event !== null &&
        "duration" in event &&
        event.duration !== null
      ) {
        const actualDuration = end
          ? end - start < event.duration
            ? end - start
            : event.duration
          : event.duration;

        setPitchIsPlaying(true);
        setTimeout(() => {
          setPitchIsPlaying(false);
        }, actualDuration * 1000);
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
  }, [
    loopIsPlaying,
    allSampleData,
    selectedSampleId,
    currentLoop,
    note,
    sampler,
  ]);

  return (
    <button
      onMouseDown={() => handlePress()}
      onTouchStart={() => handlePress()}
      onMouseUp={() => handleRelease()}
      // onMouseLeave={() => handleRelease()}
      onTouchEnd={() => handleRelease()}
      className={`border border-black text-sm cursor-pointer aspect-square ${note === allSampleData[selectedSampleId].settings.baseNote ? "bg-slate-400" : "bg-slate-300"} ${getActiveStyle()}`}
    >
      {note}
    </button>
  );
};

export default PitchPad;
