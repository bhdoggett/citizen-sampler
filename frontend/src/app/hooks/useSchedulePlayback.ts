import { useRef, useEffect, useState, use } from "react";
import { useAudioContext } from "../app/contexts/AudioContext";
import * as Tone from "tone";
import quantize from "../app/functions/quantize";
import AudioSnippetVisualizer from "./AudioSnippetVisualizer";
import { CustomSampler } from "../types/CustomSampler";

const useSchedulePlayback = (id: string) => {
  const {
    isRecording,
    loopIsPlaying,
    allSampleData,
    setAllSampleData,
    setSelectedSampleId,
    selectedSampleId,
    samplersRef,
    currentLoop,
  } = useAudioContext();
  const sampleDataRef = allSampleData[id];
  const { currentEvent } = samplersRef.current[id];
  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);

  // Schedule playback of sampler play events
  useEffect(() => {
    const sampleData = allSampleData[id];

    if (!loopIsPlaying || allSampleData[id].events[currentLoop].length === 0)
      return;

    const events = sampleData.events[currentLoop].map((event) => {
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
          note: event.note,
          // velocity: event.velocity,
        },
      ];
    });

    const part = new Tone.Part((time, event) => {
      const { start, end } = sampleDataRef.current.settings;
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
        sampler.triggerAttackRelease(event.note, actualDuration, time, start);
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
  }, [
    loopIsPlaying,
    sampler,
    allSampleData,
    id,
    selectedSampleId,
    currentLoop,
    sampleDataRef,
  ]);
};

export default useSchedulePlayback;
