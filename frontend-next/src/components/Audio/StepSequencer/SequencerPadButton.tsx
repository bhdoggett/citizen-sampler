"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import * as Tone from "tone";
import { drumKeys, getKeySymbol } from "src/lib/constants/drumKeys";
import type { SampleEventFE } from "src/types/audioTypesFE";
import { resolvePlayNote } from "src/lib/audio/util/resolvePlayNote";
import { calcReleaseDelay } from "src/lib/audio/util/calcReleaseDelay";
import { calcEventDuration } from "src/lib/audio/util/calcEventDuration";
import { resolveRelease } from "src/lib/audio/padRelease";
import { wrapTicks } from "src/lib/audio/util/timing";
import { useReportPadPlaying } from "src/app/hooks/usePadPlaying";
import styles from "./SequencerPadButton.module.css";

type SequencerPadButtonProps = {
  padId: string;
  padNumber: number;
  overrideNote?: string;
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
    currentLoop,
    allLoopSettings,
  } = useAudioContext();
  const { hotKeysActive } = useUIContext();

  const [isPressed, setIsPressed] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  // True from press to release, whatever the sound is doing in between
  const heldRef = useRef(false);
  const lastPlayNoteRef = useRef<string | null>(null);
  const currentEvent = useRef<SampleEventFE>({
    startTime: null,
    duration: 0,
    note: "",
    velocity: 1,
  });

  const padKey = drumKeys[padNumber - 1];
  useReportPadPlaying(padId, "sequencer", isPressed);

  const handlePress = useCallback(() => {
    const sampler = samplersRef.current[padId]?.sampler;
    if (!sampler) return;

    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const now = Tone.now();
    const { start, end, baseNote } = allSampleData[padId].settings;
    // overrideNote is pre-resolved by the parent; for drum mode (no overrideNote) resolve baseNote → C4
    const noteToPlay = overrideNote ?? resolvePlayNote(String(baseNote), String(baseNote));
    lastPlayNoteRef.current = noteToPlay;

    hasReleasedRef.current = false;
    heldRef.current = true;
    const bufDuration = sampler.bufferDuration;
    const offset = allSampleData[padId].settings.reverse
      ? bufDuration - (end ?? bufDuration)
      : start;
    sampler.triggerAttack(noteToPlay, now, offset, 1);
    const samplerObj = samplersRef.current[padId];
    if (samplerObj) {
      samplerObj.triggerTime = now;
      samplerObj.currentEvent.note = noteToPlay;
    }
    setSelectedSampleId(padId);
    setIsPressed(true);

    scheduledReleaseTimeoutRef.current = setTimeout(() => {
      if (!hasReleasedRef.current) {
        hasReleasedRef.current = true;
        sampler.triggerRelease(noteToPlay, Tone.now());
        const s = samplersRef.current[padId];
        if (s) s.triggerTime = null;
        setIsPressed(false);
      }
    }, calcReleaseDelay(start, end, bufDuration));

    // Start a recorded hit, or clear any earlier one so it can't be saved twice
    currentEvent.current = {
      startTime: loopIsPlaying && isRecording ? Tone.getTransport().ticks : null,
      duration: 0,
      note: noteToPlay,
      velocity: 1,
    };
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
    if (!sampler) return;

    const { releaseAudio, record } = resolveRelease({
      held: heldRef.current,
      oneShot: allSampleData[padId].settings.oneShot,
      audioReleased: hasReleasedRef.current,
    });
    heldRef.current = false;
    if (!record) return;

    if (releaseAudio) {
      if (scheduledReleaseTimeoutRef.current) {
        clearTimeout(scheduledReleaseTimeoutRef.current);
        scheduledReleaseTimeoutRef.current = null;
      }

      const { baseNote } = allSampleData[padId].settings;
      const noteToPlay = lastPlayNoteRef.current ??
        resolvePlayNote(overrideNote || String(baseNote), String(baseNote));

      hasReleasedRef.current = true;
      setIsPressed(false);
      sampler.triggerRelease(noteToPlay, Tone.now());
      const samplerObj = samplersRef.current[padId];
      if (samplerObj) samplerObj.triggerTime = null;
    }

    if (currentEvent.current.startTime == null || !loopIsPlaying || !isRecording)
      return;

    const loopSettings = allLoopSettings[currentLoop];
    if (!loopSettings) return;

    // Fold a hit read just past the loop end back to the loop start
    currentEvent.current.startTime = wrapTicks(
      currentEvent.current.startTime,
      loopSettings,
    );

    currentEvent.current.duration = calcEventDuration(
      currentEvent.current.startTime,
      Tone.getTransport().seconds,
      loopSettings,
      allSampleData[padId].settings.end,
    );

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
    allLoopSettings,
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
        const sampler = samplersRef.current[padId]?.sampler;
        if (sampler) {
          keyReleaseTimeoutRef.current = setTimeout(() => {
            setIsPressed(false);
          }, calcReleaseDelay(start, end, sampler.bufferDuration));
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
      className={`${styles.padButton} ${isPressed ? styles.pressed : ""}`}
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
