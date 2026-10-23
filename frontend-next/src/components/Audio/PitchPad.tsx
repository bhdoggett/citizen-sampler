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
import quantize from "../../lib/audio/util/quantize";
import { calcPlaybackRate } from "../../lib/audio/util/calcPlaybackRate";
import { calcReleaseDelay } from "src/lib/audio/util/calcReleaseDelay";
import { resolvePlayNote } from "../../lib/audio/util/resolvePlayNote";
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
    samplersRef,
  } = useAudioContext();
  const { activeMidiNotes } = useMidiContext();
  const currentEvent = useRef<SampleEventFE | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef<boolean>(false);
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
    // If recording, create a new event for this note
    if (loopIsPlaying && isRecording) {
      currentEvent.current = {
        startTime: null,
        duration: 0,
        note: "",
        velocity: 1,
      };
      currentEvent.current.startTime = Tone.getTransport().ticks;
      currentEvent.current.duration = 0;
      currentEvent.current.note = playNote;
      currentEvent.current.velocity = 1;
    }
  };

  const handleRelease = () => {
    if (!sampler) return;
    if (allSampleData[selectedSampleId].settings.oneShot) return;

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

    if (!currentEvent.current?.startTime) return;

    if (isRecording) {
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
      const loopEndInSeconds = Tone.Time(
        Tone.getTransport().loopEnd
      ).toSeconds();

      currentEvent.current.duration =
        actualReleaseTime > startTimeInSeconds
          ? actualReleaseTime - startTimeInSeconds
          : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;

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

  const getActiveStyle = () => {
    const isActive = pitchIsPlaying || activeMidiNotes.has(note);
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

    partRef.current = new Tone.Part((time, event) => {
      if (!sampler) return;
      const { start, end } = allSampleData[selectedSampleId].settings;
      if (
        typeof event === "object" &&
        event !== null &&
        "duration" in event &&
        event.duration !== null
      ) {
        const { baseNote } = allSampleData[selectedSampleId].settings;
        const resolvedNote = resolvePlayNote(note, String(baseNote));
        const sampleDuration = end ? (end - start) / calcPlaybackRate(resolvedNote as Tone.Unit.Frequency) : null;
        const actualDuration =
          sampleDuration !== null
            ? Math.min(sampleDuration, event.duration)
            : event.duration;

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
      className={`${styles.pitchPad} ${note === allSampleData[selectedSampleId].settings.baseNote ? styles.baseNote : ""} ${getActiveStyle()}`}
    >
      {note}
    </button>
  );
});

export default PitchPad;
