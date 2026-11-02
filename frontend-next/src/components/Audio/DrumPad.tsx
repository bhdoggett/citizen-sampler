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
import { drumKeys, getKeySymbol } from "src/lib/constants/drumKeys";
import useDrumPadHotKeys from "src/app/hooks/useDrumPadHotKeys";
import getScheduleEvents, { isPlayableEvent } from "src/lib/audio/util/getScheduleEvents";
import { calcPlaybackRate } from "src/lib/audio/util/calcPlaybackRate";
import { calcReleaseDelay } from "src/lib/audio/util/calcReleaseDelay";
import { calcEventDuration } from "src/lib/audio/util/calcEventDuration";
import { resolveRelease } from "src/lib/audio/padRelease";
import { wrapTicks } from "src/lib/audio/util/timing";
import { calcTriggerParams } from "src/lib/audio/util/calcTriggerParams";
import { resolvePlayNote } from "src/lib/audio/util/resolvePlayNote";
import type { SampleEventFE } from "src/types/audioTypesFE";
import { useReportPadPlaying } from "src/app/hooks/usePadPlaying";
import styles from "./DrumPad.module.css";
import { padNumber } from "src/lib/constants/padLayout";

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
    allLoopSettings,
    samplersRef,
  } = useAudioContext();
  const partRef = useRef<Tone.Part | null>(null);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  // True from press to release, whatever the sound is doing in between
  const heldRef = useRef(false);
  const settingsRef = useRef(allSampleData[id]?.settings);
  useEffect(() => { settingsRef.current = allSampleData[id]?.settings; }, [allSampleData, id]);
  const { baseNote } = allSampleData[id]?.settings;
  const { hotKeysActive } = useUIContext();
  const { activeMidiNotes } = useMidiContext();
  const padNum = padNumber(id);
  const padKey = drumKeys[padNum - 1];
  useReportPadPlaying(id, "drum-pad", sampleIsPlaying);
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
    heldRef.current = true;
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

    // Start a recorded hit, or clear any earlier one so it can't be saved twice
    currentEvent.current = {
      startTime: loopIsPlaying && isRecording ? Tone.getTransport().ticks : null,
      duration: 0,
      note: playNote,
      velocity: 1,
    };
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

    const { releaseAudio, record } = resolveRelease({
      held: heldRef.current,
      oneShot: allSampleData[id].settings.oneShot,
      audioReleased: hasReleasedRef.current,
    });
    heldRef.current = false;
    if (!record) return;

    if (releaseAudio) {
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
    }

    if (currentEvent.current.startTime == null || !loopIsPlaying || !isRecording)
      return;

    const loopSettings = allLoopSettings[currentLoop];
    if (!loopSettings) return;

    // Fold a hit read just past the loop end back to the loop start
    currentEvent.current.startTime = wrapTicks(
      currentEvent.current.startTime,
      loopSettings
    );

    currentEvent.current.duration = calcEventDuration(
      currentEvent.current.startTime,
      Tone.getTransport().seconds,
      loopSettings,
      allSampleData[id].settings.end
    );

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
    allLoopSettings,
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

  useDrumPadHotKeys({
    hotKeysActive,
    padKey,
    onPress: handlePress,
    onRelease: handleRelease,
  });

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

  // **** Schedule playback of sampler play events ****
  useEffect(() => {
    const loopSettings = allLoopSettings[currentLoop];
    if (
      !loopSettings ||
      !loopIsPlaying ||
      allSampleData[id].events[currentLoop].length === 0
    ) {
      return;
    }

    const scheduleEvents = getScheduleEvents(
      allSampleData,
      id,
      currentLoop,
      loopSettings
    );

    partRef.current = new Tone.Part((time, event) => {
      if (!sampler) return;
      if (isPlayableEvent(event)) {
        const { duration: actualDuration, offset } = calcTriggerParams(
          settingsRef.current,
          calcPlaybackRate(event.note),
          event.duration,
          sampler.bufferDuration
        );
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
    allLoopSettings,
  ]);

  //Dispose part to cleanup if the loop stops playing
  useEffect(() => {
    if (partRef.current && !loopIsPlaying) disposePart();
  }, [loopIsPlaying]);

  const isSelected = selectedSampleId === id;

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
        id={String(padNum)}
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
