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
import { resolvePlayNote } from "src/lib/audio/util/resolvePlayNote";
import type { SampleEventFE } from "src/types/audioTypesFE";

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
  } = useAudioContext();
  const partRef = useRef<Tone.Part | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [sampleIsPlaying, setSampleIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);
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
    sampler.triggerAttack(playNote, now, start, 1);
    setSelectedSampleId(id);
    setIsSelected(true);
    setSampleIsPlaying(true);

    if (end) {
      const duration = (end - start) / calcPlaybackRate(playNote as Tone.Unit.Frequency);
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(playNote, Tone.now());
          setSampleIsPlaying(false);
        }
      }, duration * 1000);
    }

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
    setSelectedSampleId,
  ]);

  const handleRelease = useCallback(() => {
    // const currentEvent = getCurrentEvent();
    if (!sampler) return;

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
    if (!allSampleData[id] || !allSampleData[id].settings) return;
    if (allSampleData[id].settings.mute) return "bg-red-400";
    if (allSampleData[id].settings.solo) return "bg-yellow-200";
    return "bg-slate-400";
  };

  // Get the active style based on whether the sample is playing
  const getActiveStyle = () => {
    const isActive =
      sampleIsPlaying || (id === selectedSampleId && activeMidiNotes.size > 0);
    return isActive
      ? "brightness-75 saturate-150 translate-x-[2px] translate-y-[1px] shadow-cyan-200 transition-all duration-25 border-cyan-400"
      : "brightness-100 saturate-100 shadow-md shadow-slate-500 translate-x-0 translate-y-0 transition-all duration-25 border-gray-600";
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
      const { start, end } = allSampleData[id].settings;

      if (
        typeof event === "object" &&
        event !== null &&
        "duration" in event &&
        event.duration !== null
      ) {
        const sampleDuration = end ? (end - start) / calcPlaybackRate(event.note) : null;
        const actualDuration =
          sampleDuration !== null
            ? Math.min(sampleDuration, event.duration)
            : event.duration;

        sampler.triggerAttackRelease(
          event.note,
          actualDuration,
          time,
          start,
          event.velocity
        );
        setSampleIsPlaying(true);

        setTimeout(() => {
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
      className={`relative flex m-auto rounded-sm w-full select-none aspect-square ${isSelected ? "border-2 border-blue-600" : "border-2 border-transparent"}`}
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
        className={`relative flex flex-col select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-select:none] [-webkit-tap-highlight-color:transparent]  ${getActiveStyle()} ${getPadColor()} m-1  w-full aspect-square shadow-md shadow-slate-500 className="bg-gray-800 border-2  rounded-lg hover:shadow-lg hover:shadow-cyan-400/50 hover:border-cyan-400 transition-all duration-200 cursor-pointer"`}
      >
        <div className="flex ml-0.5 justify-between w-[95%]">
          <span className="flex text-sm font-bold">{padNum}</span>
          <span className="flex text-xs italic">
            {hotKeysActive ? getKeySymbol(padKey) : ""}
          </span>
        </div>
        <AudioSnippetVisualizer url={allSampleData[id].url} />
      </button>
    </div>
  );
});

export default DrumPad;
