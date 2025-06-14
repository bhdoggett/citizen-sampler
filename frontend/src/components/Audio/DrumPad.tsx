"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import * as Tone from "tone";
import { Frequency } from "tone/build/esm/core/type/Units";
import quantize from "../../app/functions/quantize";
import AudioSnippetVisualizer from "./AudioSnippetVisualizer";
import { CustomSampler } from "../../types/CustomSampler";
import { drumKeys } from "src/lib/constants/drumKeys";

type DrumPadProps = {
  id: string;
  sampler: CustomSampler | null;
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
    currentLoop,
  } = useAudioContext();
  // const sampleDataRef = useRef(allSampleData[id]);

  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  const baseNote: Frequency = allSampleData[id]?.settings.baseNote;
  const { hotKeysActive } = useUIContext();
  const padNum = id.split("-")[1];
  const padKey = drumKeys[Number(padNum) - 1];
  const getCurrentEvent = useCallback(
    () => samplersRef.current[id]?.currentEvent,
    [id, samplersRef]
  );

  const handlePress = useCallback(() => {
    const currentEvent = getCurrentEvent();
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const now = Tone.now();
    const { start, end } = allSampleData[id].settings;

    hasReleasedRef.current = false;
    sampler.triggerAttack(baseNote, now, start, 1);
    setSelectedSampleId(id);
    setIsSelected(true);
    setSampleIsPlaying(true);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(baseNote, Tone.now());
          setSampleIsPlaying(false);
        }
      }, duration * 1000);
    }

    if (loopIsPlaying && isRecording) {
      currentEvent.startTime = Tone.getTransport().ticks;
      currentEvent.duration = 0;
      currentEvent.note = baseNote;
    }
  }, [
    allSampleData,
    baseNote,
    getCurrentEvent,
    id,
    isRecording,
    loopIsPlaying,
    sampler,
    setSelectedSampleId,
  ]);

  const handleRelease = useCallback(() => {
    const currentEvent = getCurrentEvent();
    if (!sampler) return;

    if (!sampleIsPlaying) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    setSampleIsPlaying(false);
    sampler.triggerRelease(baseNote, Tone.now());

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

    setAllSampleData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        events: {
          ...prev[id].events,
          [currentLoop]: [
            ...(prev[id].events[currentLoop] || []),
            { ...currentEvent },
          ],
        },
      },
    }));
  }, [
    allSampleData,
    baseNote,
    getCurrentEvent,
    id,
    isRecording,
    loopIsPlaying,
    sampler,
    currentLoop,
    sampleIsPlaying,
    selectedSampleId,
    setAllSampleData,
  ]);

  const handleFocus = () => {
    setSelectedSampleId(id);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!hotKeysActive || e.metaKey || e.repeat) return;
      if (e.key === padKey) {
        e.preventDefault();
        handlePress();
      }
    },
    [hotKeysActive, handlePress, padKey]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!hotKeysActive) return;
      if (e.key === padKey) {
        e.preventDefault();
        handleRelease();
      }
    },
    [hotKeysActive, handleRelease, padKey]
  );

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

  const getKeySymbol = (key: string): string => {
    const arrowMap: Record<string, string> = {
      ArrowLeft: "←",
      ArrowUp: "↑",
      ArrowRight: "→",
      ArrowDown: "↓",
    };
    return arrowMap[key] || key;
  };

  // Activate hotkeys for pad interaction
  // Add event listeners for keydown and keyup events
  // and clean up on unmount or when hotKeysActive changes
  useEffect(() => {
    if (hotKeysActive) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [hotKeysActive, handleKeyDown, handleKeyUp]);

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
          velocity: event.velocity,
        },
      ];
    });

    const part = new Tone.Part((time, event) => {
      if (!sampler) return;
      const { start, end } = allSampleData[id].settings;
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
        }, actualDuration * 1000);
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

  return (
    <div
      className={`flex m-auto rounded-sm w-full select-none backdrop:aspect-square ${isSelected ? "border-2 border-blue-600" : "border-2 border-transparent"}`}
      onFocus={handleFocus}
    >
      <button
        id={padNum}
        onMouseDown={handlePress}
        onMouseEnter={(e) => {
          if (e.buttons === 1) {
            handlePress();
          }
        }}
        onTouchStart={handlePress}
        onMouseUp={handleRelease}
        onMouseLeave={() => handleRelease()}
        onTouchEnd={() => handleRelease()}
        className={`flex flex-col select-none ${getActiveStyle()} ${getPadColor()} m-1 border-4 border-slate-800 w-full aspect-square shadow-md shadow-slate-500  `}
      >
        <div className="mx-0.5 flex justify-between">
          <span className="flex top-1 left-0 text-sm font-bold">{padNum}</span>
          <span className="flex top-1 left-0 text-xs italic">
            {hotKeysActive ? getKeySymbol(padKey) : ""}
          </span>
        </div>

        <AudioSnippetVisualizer id={id} />
      </button>
    </div>
  );
};

export default DrumPad;
