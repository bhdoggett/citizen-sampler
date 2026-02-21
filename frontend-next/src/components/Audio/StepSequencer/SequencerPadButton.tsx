"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import * as Tone from "tone";
import { drumKeys } from "src/lib/constants/drumKeys";
import type { SampleEventFE } from "src/types/audioTypesFE";

type SequencerPadButtonProps = {
  padId: string;
  padNumber: number;
  overrideNote?: string;
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

const SequencerPadButton: React.FC<SequencerPadButtonProps> = ({
  padId,
  padNumber,
  overrideNote,
}) => {
  const {
    samplersRef,
    isRecording,
    loopIsPlaying,
    allSampleData,
    setAllSampleData,
    setSelectedSampleId,
    selectedSampleId,
    currentLoop,
  } = useAudioContext();
  const { hotKeysActive } = useUIContext();

  const [isPressed, setIsPressed] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  const currentEvent = useRef<SampleEventFE>({
    startTime: null,
    duration: 0,
    note: "",
    velocity: 1,
  });

  const padKey = drumKeys[padNumber - 1];

  const handlePress = useCallback(() => {
    const sampler = samplersRef.current[padId]?.sampler;
    if (!sampler) return;

    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const now = Tone.now();
    const { start, end, baseNote } = allSampleData[padId].settings;
    const noteToPlay = overrideNote || baseNote;

    hasReleasedRef.current = false;
    sampler.triggerAttack(noteToPlay, now, start, 1);
    setSelectedSampleId(padId);
    setIsPressed(true);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(noteToPlay, Tone.now());
          setIsPressed(false);
        }
      }, duration * 1000);
    }

    if (loopIsPlaying && isRecording) {
      currentEvent.current.startTime = Tone.getTransport().ticks;
      currentEvent.current.duration = 0;
      currentEvent.current.note = noteToPlay;
      currentEvent.current.velocity = 1;
    }
  }, [
    allSampleData,
    padId,
    isRecording,
    loopIsPlaying,
    samplersRef,
    setSelectedSampleId,
    overrideNote,
  ]);

  const handleRelease = useCallback(() => {
    const sampler = samplersRef.current[padId]?.sampler;
    if (!sampler || !isPressed) return;

    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const { baseNote } = allSampleData[padId].settings;
    const noteToPlay = overrideNote || baseNote;

    hasReleasedRef.current = true;
    setIsPressed(false);
    sampler.triggerRelease(noteToPlay, Tone.now());

    if (!currentEvent.current.startTime || !loopIsPlaying || !isRecording)
      return;

    const padReleasetime = Tone.getTransport().seconds;
    const sampleEnd = allSampleData[selectedSampleId]?.settings.end;

    const actualReleaseTime = sampleEnd
      ? padReleasetime < sampleEnd
        ? padReleasetime
        : sampleEnd
      : padReleasetime;

    const startTimeInSeconds = Tone.Ticks(
      currentEvent.current.startTime,
    ).toSeconds();
    const loopEndInSeconds = Tone.Time(Tone.getTransport().loopEnd).toSeconds();

    currentEvent.current.duration =
      actualReleaseTime > startTimeInSeconds
        ? actualReleaseTime - startTimeInSeconds
        : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;

    setAllSampleData((prev) => ({
      ...prev,
      [padId]: {
        ...prev[padId],
        events: {
          ...prev[padId].events,
          [currentLoop]: [
            ...(prev[padId].events[currentLoop] || []),
            { ...currentEvent.current! },
          ],
        },
      },
    }));
  }, [
    allSampleData,
    padId,
    isRecording,
    loopIsPlaying,
    samplersRef,
    currentLoop,
    isPressed,
    selectedSampleId,
    setAllSampleData,
    overrideNote,
  ]);

  // Sync visual state with keyboard hotkeys (audio is triggered by DrumPad)
  // Skip hotkey registration for piano roll rows (overrideNote set)
  const keyReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!hotKeysActive || overrideNote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.repeat) return;
      if (e.key === padKey) {
        if (keyReleaseTimeoutRef.current) {
          clearTimeout(keyReleaseTimeoutRef.current);
          keyReleaseTimeoutRef.current = null;
        }
        setIsPressed(true);

        const { start, end } = allSampleData[padId].settings;
        if (end) {
          const duration = end - start;
          keyReleaseTimeoutRef.current = setTimeout(() => {
            setIsPressed(false);
          }, duration * 1000);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === padKey) {
        if (keyReleaseTimeoutRef.current) {
          clearTimeout(keyReleaseTimeoutRef.current);
          keyReleaseTimeoutRef.current = null;
        }
        setIsPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (keyReleaseTimeoutRef.current) {
        clearTimeout(keyReleaseTimeoutRef.current);
      }
    };
  }, [hotKeysActive, padKey, allSampleData, padId, overrideNote]);

  return (
    <button
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      className={`flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold cursor-pointer select-none transition-all duration-75 border border-gray-700
        ${isPressed
          ? "bg-cyan-400 text-white scale-95"
          : "bg-gray-500 hover:bg-gray-600 text-white"
        }`}
      title={
        overrideNote
          ? `Play ${overrideNote}`
          : `Play pad ${padNumber} (${hotKeysActive ? getKeySymbol(padKey) : padKey})`
      }
    >
      {overrideNote ? "\u25B6" : hotKeysActive ? getKeySymbol(padKey) : ""}
    </button>
  );
};

export default SequencerPadButton;
