"use client";
import { useRef, useEffect, useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import * as Tone from "tone";
import { Frequency } from "tone/build/esm/core/type/Units";
import quantize from "../../app/functions/quantize";
import AudioSnippetVisualizer from "./AudioSnippetVisualizer";
import { CustomSampler } from "../../types/CustomSampler";
import PitchGrid from "./PitchGrid";

type DrumPadProps = {
  id: string;
  sampler: CustomSampler | null;
  showGrid: boolean;
};

const DrumPad: React.FC<DrumPadProps> = ({ id, sampler, showGrid }) => {
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
  const sampleDataRef = useRef(allSampleData[id]);
  const currentEvent = samplersRef.current[id]?.currentEvent;
  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  const baseNote = allSampleData[id]?.settings.baseNote;

  const handlePress = (note: Frequency) => {
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
    setSelectedSampleId(id);
    setIsSelected(true);
    setSampleIsPlaying(true);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(note, Tone.now());
          setSampleIsPlaying(false);
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

    if (!sampleIsPlaying) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    setSampleIsPlaying(false);
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
    setAllSampleData((prev) => ({ ...prev, [id]: sampleDataRef.current }));

    if (loopIsPlaying && isRecording && currentEvent.duration === 0) {
    }
  };

  const handleFocus = () => {
    setSelectedSampleId(id);
  };

  const getPadColor = () => {
    if (!allSampleData[id] || !allSampleData[id].settings) return;
    if (allSampleData[id].settings.mute) return "bg-red-400";
    if (allSampleData[id].settings.solo) return "bg-yellow-200";
    return "bg-slate-400";
  };

  const getActiveStyle = () => {
    return sampleIsPlaying
      ? "brightness-75 saturate-150 transition-all duration-100"
      : "brightness-100 saturate-100 transition-all duration-300";
  };

  // Update this component's sampleDataRef when allSampleData state changes
  useEffect(() => {
    sampleDataRef.current = allSampleData[id];
  }, [allSampleData, id]);

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
      if (!sampler) return;
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
        sampler.triggerAttackRelease(
          event.note,
          actualDuration,
          time,
          start,
          1
        );
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
  ]);

  // Sync isSelected state with selectedSampleId
  useEffect(() => {
    setIsSelected(selectedSampleId === id);
  }, [selectedSampleId, id]);

  return showGrid ? (
    <PitchGrid
      baseNote={baseNote}
      handlePress={handlePress}
      handleRelease={handleRelease}
    />
  ) : (
    <div
      className={`flex m-auto rounded-sm w-full aspect-square ${isSelected ? "border-2 border-blue-600" : "border-2 border-transparent"}`}
      onFocus={handleFocus}
    >
      <button
        onMouseDown={() => handlePress(baseNote)}
        onTouchStart={() => handlePress(baseNote)}
        onMouseUp={() => handleRelease(baseNote)}
        onMouseLeave={() => handleRelease(baseNote)}
        onTouchEnd={() => handleRelease(baseNote)}
        className={`flex flex-col select-none ${getActiveStyle()} ${getPadColor()} m-1 border-4 border-slate-800  focus:border-double w-full aspect-square shadow-md shadow-slate-700  `}
      >
        <p className="flex top-1 left-0 text-xs">{id}</p>
        <AudioSnippetVisualizer id={id} />
      </button>
    </div>
  );
};

export default DrumPad;
