"use client";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import { useMidiContext } from "../../app/contexts/MidiContext";
import * as Tone from "tone";
import AudioSnippetVisualizer from "./AudioSnippetVisualizer";
import { CustomSampler } from "../../types/CustomSampler";
import { drumKeys } from "src/lib/constants/drumKeys";
import getScheduleEvents from "src/lib/audio/util/getScheduleEvents";
import { calcPlaybackRate } from "src/lib/audio/util/calcPlaybackRate";
import { calcReleaseDelay } from "src/lib/audio/util/calcReleaseDelay";
import { resolvePlayNote } from "src/lib/audio/util/resolvePlayNote";
import type { SampleEventFE } from "src/types/audioTypesFE";
import styles from "./DrumPad.module.css";

type DrumPadProps = {
  id: string;
  sampler: CustomSampler | null;
  buttonRef?: React.Ref<HTMLButtonElement>;
};

const DrumPad = forwardRef(function DrumPad(
  { id, sampler, buttonRef }: DrumPadProps,
  ref
) {
  const {
    isRecording,
    loopIsPlaying,
    allSampleData,
    setAllSampleData,
    setSelectedSampleId,
    selectedSampleId,
    currentLoop,
    samplersRef,
  } = useAudioContext();
  const partRef = useRef<Tone.Part | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  const settingsRef = useRef(allSampleData[id]?.settings);
  useEffect(() => { settingsRef.current = allSampleData[id]?.settings; }, [allSampleData, id]);
  const { baseNote } = allSampleData[id]?.settings;
  const { hotKeysActive } = useUIContext();
  const { activeMidiNotes } = useMidiContext();
  const padNum = id.split("-")[1];
  const padKey = drumKeys[Number(padNum) - 1];
  const currentEvent = useRef<SampleEventFE>({
    startTime: null,
    duration: 0,
    note: "",
    velocity: 1,
  });

  const handlePress = useCallback(() => {
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }
    const now = Tone.now();
    const { start, end } = allSampleData[id].settings;

    // Transpose relative to C4 reference — see resolvePlayNote.ts
    // DrumPad always plays at natural pitch, so resolve baseNote against itself → C4
    const playNote = resolvePlayNote(String(baseNote), String(baseNote));

    hasReleasedRef.current = false;
    const bufDuration = sampler.bufferDuration;
    const offset = allSampleData[id].settings.reverse
      ? bufDuration - (end ?? bufDuration)
      : start;
    sampler.triggerAttack(playNote, now, offset, 1);
    const samplerObj = samplersRef.current[id];
    if (samplerObj) {
      samplerObj.triggerTime = now;
      samplerObj.currentEvent.note = playNote;
    }
    setSelectedSampleId(id);
    setIsSelected(true);
    setSampleIsPlaying(true);

    scheduledReleaseTimeoutRef.current = setTimeout(() => {
      if (!hasReleasedRef.current) {
        hasReleasedRef.current = true;
        sampler.triggerRelease(playNote, Tone.now());
        const s = samplersRef.current[id];
        if (s) s.triggerTime = null;
        setSampleIsPlaying(false);
      }
    }, calcReleaseDelay(
      start,
      end,
      bufDuration,
      calcPlaybackRate(playNote as Tone.Unit.Frequency),
    ));

    if (loopIsPlaying && isRecording) {
      currentEvent.current.startTime = Tone.getTransport().ticks;
      currentEvent.current.duration = 0;
      currentEvent.current.note = playNote;
      currentEvent.current.velocity = 1;
    }
  }, [
    allSampleData,
    baseNote,
    id,
    isRecording,
    loopIsPlaying,
    sampler,
    samplersRef,
    setSelectedSampleId,
  ]);

  const handleRelease = useCallback(() => {
    // const currentEvent = getCurrentEvent();
    if (!sampler) return;
    if (allSampleData[id].settings.oneShot) return;

    if (!sampleIsPlaying) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    setSampleIsPlaying(false);
    // Transpose relative to C4 reference — see resolvePlayNote.ts
    const playNote = resolvePlayNote(String(baseNote), String(baseNote));
    sampler.triggerRelease(playNote, Tone.now());
    const samplerObj = samplersRef.current[id];
    if (samplerObj) samplerObj.triggerTime = null;

    if (!currentEvent.current.startTime || !loopIsPlaying || !isRecording)
      return;

    const padReleasetime = Tone.getTransport().seconds;
    const sampleEnd = allSampleData[selectedSampleId].settings.end;

    const actualReleaseTime = sampleEnd
      ? padReleasetime < sampleEnd
        ? padReleasetime
        : sampleEnd
      : padReleasetime;

    const startTimeInSeconds = Tone.Ticks(
      currentEvent.current.startTime
    ).toSeconds();
    const loopEndInSeconds = Tone.Time(Tone.getTransport().loopEnd).toSeconds();

    currentEvent.current.duration =
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
            { ...currentEvent.current! },
          ],
        },
      },
    }));
  }, [
    allSampleData,
    baseNote,
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

  const disposePart = () => {
    if (partRef.current) {
      try {
        if (partRef.current.state === "started") {
          partRef.current.stop();
        }
        partRef.current.dispose();
      } catch (error) {
        console.warn("Error disposing part:", error);
      }
    }
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

  // Get the color of the pad based on its mute/solo settings
  const getPadColor = () => {
    if (!allSampleData[id] || !allSampleData[id].settings) return "";
    if (allSampleData[id].settings.mute) return styles.muted;
    if (allSampleData[id].settings.solo) return styles.soloed;
    return "";
  };

  const getActiveStyle = () => {
    const isActive =
      sampleIsPlaying || (id === selectedSampleId && activeMidiNotes.size > 0);
    return isActive ? styles.active : "";
  };

  // Convert arrow keys to symbols for display
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

  // **** Schedule playback of sampler play events ****
  useEffect(() => {
    if (!loopIsPlaying || allSampleData[id].events[currentLoop].length === 0) {
      return;
    }

    const scheduleEvents = getScheduleEvents(allSampleData, id, currentLoop);

    partRef.current = new Tone.Part((time, event) => {
      if (!sampler) return;
      const { start, end, oneShot } = settingsRef.current;

      if (
        typeof event === "object" &&
        event !== null &&
        "duration" in event &&
        event.duration !== null
      ) {
        const sampleDuration = end ? (end - start) / calcPlaybackRate(event.note) : null;
        const actualDuration = oneShot
          ? (sampleDuration ?? 999)
          : sampleDuration !== null
            ? Math.min(sampleDuration, event.duration)
            : event.duration;

        const bufDuration = sampler.bufferDuration;
        const offset = settingsRef.current.reverse
          ? bufDuration - (end ?? bufDuration)
          : start;
        sampler.triggerAttackRelease(
          event.note,
          actualDuration,
          time,
          offset,
          event.velocity
        );
        const s = samplersRef.current[id];
        if (s) {
          s.triggerTime = time;
          s.currentEvent.note = event.note;
        }
        setSampleIsPlaying(true);

        setTimeout(() => {
          const s = samplersRef.current[id];
          if (s) s.triggerTime = null;
          setSampleIsPlaying(false);
        }, actualDuration * 1000);
      }
    }, scheduleEvents);

    partRef.current.start(0);

    // Cleanup function
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

  //Dispose part to cleanup if the loop stops playing
  useEffect(() => {
    if (partRef.current && !loopIsPlaying) disposePart();
  }, [loopIsPlaying]);

  // Sync isSelected state with selectedSampleId
  useEffect(() => {
    setIsSelected(selectedSampleId === id);
  }, [selectedSampleId, id]);

  useImperativeHandle(ref, () => ({
    handlePress,
    handleRelease,
  }));

  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.selected : ""}`}
      onFocus={handleFocus}
    >
      <button
        id={padNum}
        ref={buttonRef}
        onMouseDown={handlePress}
        onMouseEnter={(e) => {
          if (e.buttons === 1) {
            handlePress();
          }
        }}
        onMouseUp={handleRelease}
        onMouseLeave={() => handleRelease()}
        // Disable touch default behavior. Handle touch events in DrumMachine.tsx
        onTouchStart={(e) => {
          e.preventDefault();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
        }}
        className={`${styles.pad} ${getPadColor()} ${getActiveStyle()}`}
      >
        <div className={styles.labels}>
          <span className={styles.number}>{padNum}</span>
          <span className={styles.key}>
            {hotKeysActive ? getKeySymbol(padKey) : ""}
          </span>
        </div>
        <AudioSnippetVisualizer url={allSampleData[id].url} />
      </button>
    </div>
  );
});

export default DrumPad;
