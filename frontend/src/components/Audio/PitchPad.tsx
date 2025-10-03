import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../contexts/AudioContext";
import { CustomSampler } from "../../types/CustomSampler";
import { SampleEventFE } from "../../types/audioTypesFE";
import quantize from "../../lib/audio/util/quantize";

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
  } = useAudioContext();
  const currentEvent = useRef<SampleEventFE | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const scheduledReleaseTimeoutRef = useRef<number | null>(null);
  const hasReleasedRef = useRef<boolean>(false);
  const lastPressTimeRef = useRef<number>(0);
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

    const { start, end } = allSampleData[selectedSampleId].settings;

    hasReleasedRef.current = false;
    sampler.triggerAttack(note, now, start, 1);
    setPitchIsPlaying(true);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = window.setTimeout(() => {
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

  const getActiveStyle = () => {
    return pitchIsPlaying
      ? "brightness-75 saturate-500 transition-all duration-100"
      : "brightness-100 saturate-100 transition-all duration-100";
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

    partRef.current = new Tone.Part((_time, event) => {
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
      className={`border border-black text-sm cursor-pointer w-full shadow-inner shadow-slate-600 select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-select:none] [-webkit-tap-highlight-color:transparent] ${note === allSampleData[selectedSampleId].settings.baseNote ? "bg-slate-400 " : "bg-slate-300"} ${getActiveStyle()}`}
    >
      {note}
    </button>
  );
});

export default PitchPad;
