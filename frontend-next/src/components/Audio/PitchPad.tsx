"use client";
import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useMidiContext } from "../../app/contexts/MidiContext";
import { CustomSampler } from "../../types/CustomSampler";
import { SampleEventFE } from "src/types/audioTypesFE";
import { wrapTicks } from "../../lib/audio/util/timing";
import getScheduleEvents, {
  isPlayableEvent,
} from "../../lib/audio/util/getScheduleEvents";
import { calcEventDuration } from "../../lib/audio/util/calcEventDuration";
import { resolveRelease } from "../../lib/audio/padRelease";
import { calcTriggerParams } from "../../lib/audio/util/calcTriggerParams";
import { calcPlaybackRate } from "../../lib/audio/util/calcPlaybackRate";
import { calcReleaseDelay } from "src/lib/audio/util/calcReleaseDelay";
import { resolvePlayNote } from "../../lib/audio/util/resolvePlayNote";
import { usePadPlaying } from "src/app/hooks/usePadPlaying";
import styles from "./PitchPad.module.css";

type PitchPadProps = {
  note: string;
  sampler: CustomSampler;
  pitchPadsRef: React.RefObject<Record<string, HTMLButtonElement | null>>;
};

const PitchPad = forwardRef(function PitchPad(
  { note, sampler, pitchPadsRef }: PitchPadProps,
  ref
) {
  const {
    selectedSampleId,
    allSampleData,
    setAllSampleData,
    loopIsPlaying,
    isRecording,
    currentLoop,
    allLoopSettings,
    samplersRef,
  } = useAudioContext();
  const { activeMidiNotes } = useMidiContext();
  const currentEvent = useRef<SampleEventFE | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
  // True from press to release, whatever the sound is doing in between
  const heldRef = useRef(false);
  const lastPressTimeRef = useRef<number>(0);
  const lastPlayNoteRef = useRef<string | null>(null);
  const [pitchIsPlaying, setPitchIsPlaying] = useState<boolean>(false);

  const handlePress = async () => {
    const now = Tone.now();
    // Check if enough time has passed since last press
    if (now - lastPressTimeRef.current < 0.01) {
      return; // Ignore this press (debounced)
    }

    // Ensure audio context is running
    const audioContext = Tone.getContext();
    if (audioContext.state !== "running") {
      try {
        await Tone.start();
        // Wait a tiny bit to ensure context is truly ready
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error("Failed to start audio context:", error);
        return;
      }
    }

    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    const { start, end, baseNote } = allSampleData[selectedSampleId].settings;

    // Transpose relative to C4 reference — see resolvePlayNote.ts
    const playNote = resolvePlayNote(note, String(baseNote));
    // Store so handleRelease uses the same note even if baseNote changes
    lastPlayNoteRef.current = playNote;

    hasReleasedRef.current = false;
    heldRef.current = true;
    const bufDuration = sampler.bufferDuration;
    const offset = allSampleData[selectedSampleId].settings.reverse
      ? bufDuration - (end ?? bufDuration)
      : start;
    sampler.triggerAttack(playNote, now, offset, 1);
    const samplerObj = samplersRef.current[selectedSampleId];
    if (samplerObj) {
      samplerObj.triggerTime = Tone.now();
      samplerObj.currentEvent.note = playNote;
    }
    setPitchIsPlaying(true);

    scheduledReleaseTimeoutRef.current = setTimeout(() => {
      if (!hasReleasedRef.current) {
        hasReleasedRef.current = true;
        sampler.triggerRelease(playNote, Tone.now());
        const s = samplersRef.current[selectedSampleId];
        if (s) s.triggerTime = null;
        setPitchIsPlaying(false);
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
  };

  const handleRelease = () => {
    if (!sampler) return;

    const { releaseAudio, record } = resolveRelease({
      held: heldRef.current,
      oneShot: allSampleData[selectedSampleId].settings.oneShot,
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
      setPitchIsPlaying(false);
      // Use the playNote stored at press time — avoids stale-baseNote mismatch
      const { baseNote } = allSampleData[selectedSampleId].settings;
      const playNote = lastPlayNoteRef.current ?? resolvePlayNote(note, String(baseNote));
      sampler.triggerRelease(playNote, Tone.now());
      const samplerObj = samplersRef.current[selectedSampleId];
      if (samplerObj) samplerObj.triggerTime = null;
    }

    if (currentEvent.current?.startTime == null) return;

    if (isRecording) {
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
        allSampleData[selectedSampleId].settings.end
      );

      setAllSampleData((prev) => ({
        ...prev,
        [selectedSampleId]: {
          ...prev[selectedSampleId],
          events: {
            ...prev[selectedSampleId].events,
            [currentLoop]: [
              ...(prev[selectedSampleId].events[currentLoop] || []),
              { ...currentEvent.current! },
            ],
          },
        },
      }));
    }
  };

  // The root note lights up while the selected pad is played from the drum
  // pads or sequencer, since that plays the sample at its base note.
  const isRootNote = note === allSampleData[selectedSampleId].settings.baseNote;
  const rootPadPlaying = usePadPlaying(isRootNote ? selectedSampleId : null);

  const getActiveStyle = () => {
    const isActive =
      pitchIsPlaying || rootPadPlaying || activeMidiNotes.has(note);
    return isActive ? styles.active : "";
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

  // Schedule playback of events, strictly for visual render feedback on the PitchPad
  useEffect(() => {
    const loopSettings = allLoopSettings[currentLoop];

    if (
      !loopSettings ||
      !loopIsPlaying ||
      allSampleData[selectedSampleId].events[currentLoop].length === 0
    )
      return;

    // Same schedule as the pad's audio, so loop-end hits wrap the same way
    const events = getScheduleEvents(
      allSampleData,
      selectedSampleId,
      currentLoop,
      loopSettings
    ).filter(([, event]) => event.note === note);

    partRef.current = new Tone.Part((time, event) => {
      if (!sampler) return;
      if (isPlayableEvent(event)) {
        const settings = allSampleData[selectedSampleId].settings;
        const resolvedNote = resolvePlayNote(note, String(settings.baseNote));
        const { duration: actualDuration } = calcTriggerParams(
          settings,
          calcPlaybackRate(resolvedNote as Tone.Unit.Frequency),
          event.duration,
          sampler.bufferDuration
        );

        setPitchIsPlaying(true);
        setTimeout(() => {
          setPitchIsPlaying(false);
        }, actualDuration * 1000);
      }
    }, events);

    partRef.current.start(0);

    return () => {
      disposePart();
    };
  }, [
    loopIsPlaying,
    allSampleData,
    selectedSampleId,
    currentLoop,
    allLoopSettings,
    note,
    sampler,
  ]);

  useEffect(() => {
    if (partRef.current && !loopIsPlaying) {
      disposePart();
    }
  }, [loopIsPlaying]);

  // clear currentEvent when selectedSampleId changes
  useEffect(() => {
    currentEvent.current = {
      startTime: null,
      duration: 0,
      note: "",
      velocity: 1,
    };
  }, [selectedSampleId]);

  useImperativeHandle(ref, () => ({
    handlePress,
    handleRelease,
  }));

  return (
    <button
      ref={(el) => {
        pitchPadsRef.current[note] = el;
      }} // handle touch events in PitchGrid.tsx
      // Only keep mouse events for desktop
      onMouseDown={handlePress}
      onMouseEnter={(e) => {
        if (e.buttons === 1) {
          handlePress();
        }
      }}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      // Disable touch default behavior. Handle touch events in PitchGrid.tsx
      onTouchStart={(e) => {
        e.preventDefault();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
      }}
      className={`${styles.pitchPad} ${isRootNote ? styles.baseNote : ""} ${getActiveStyle()}`}
    >
      {note}
    </button>
  );
});

export default PitchPad;
