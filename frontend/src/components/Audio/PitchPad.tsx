"use client";
import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { CustomSampler } from "../../types/CustomSampler";
import { SampleEventFE } from "src/types/audioTypesFE";
import quantize from "../../lib/audio/util/quantize";

type PitchPadProps = {
  note: string;
  sampler: CustomSampler;
};

const PitchPad: React.FC<PitchPadProps> = ({ note, sampler }) => {
  const {
    selectedSampleId,
    allSampleData,
    setAllSampleData,
    loopIsPlaying,
    isRecording,
    currentLoop,
  } = useAudioContext();
  const currentEvent = useRef<SampleEventFE | null>(null);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef<boolean>(false);
  const lastPressTimeRef = useRef<number>(0);
  const [pitchIsPlaying, setPitchIsPlaying] = useState<boolean>(false);
  // const debounceDelay = 0.01; // 10ms debounce delay

  const handlePress = async () => {
    console.log("handlePress called!", new Error().stack);
    console.log(
      "events for this sampler:",
      allSampleData[selectedSampleId].events
    );

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

    const { start, end } = allSampleData[selectedSampleId].settings;

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
      currentEvent.current.note = note;
      currentEvent.current.velocity = 1;
    }
  };

  const handleRelease = () => {
    if (!sampler) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    setPitchIsPlaying(false);
    sampler.triggerRelease(note, Tone.now());

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

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleRelease();
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

  // clear currentEvent when selectedSampleId changes
  useEffect(() => {
    currentEvent.current = {
      startTime: null,
      duration: 0,
      note: "",
      velocity: 1,
    };
  }, [selectedSampleId]);

  return (
    <button
      onMouseDown={(e) => {
        console.log("🖱️ MOUSEDOWN triggered handlePress", e.type, e.target);
        handlePress();
      }}
      onMouseEnter={(e) => {
        console.log("🖱️ MOUSEENTER - buttons:", e.buttons);
        if (e.buttons === 1) {
          console.log("🖱️ MOUSEENTER triggered handlePress", e.type, e.target);
          handlePress();
        }
      }}
      onTouchStart={(e) => {
        console.log("📱 TOUCHSTART triggered handlePress", e.type, e.target);
        handlePress();
      }}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchEnd={handleTouchEnd}
      className={`border border-black text-sm cursor-pointer aspect-square shadow-inner shadow-slate-600 select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-select:none] [-webkit-tap-highlight-color:transparent] ${note === allSampleData[selectedSampleId].settings.baseNote ? "bg-slate-400" : "bg-slate-300"} ${getActiveStyle()}`}
    >
      {note}
    </button>
  );
};

export default PitchPad;
