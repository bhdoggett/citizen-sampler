"use client";
import { createContext, useContext, useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import { useAudioContext } from "./AudioContext";
import { useMidi } from "../hooks/useMidi";
import { SampleEventFE } from "src/types/audioTypesFE";
import { calcEventDuration } from "../../lib/audio/util/calcEventDuration";
import { calcPlaybackRate } from "../../lib/audio/util/calcPlaybackRate";

type MidiContextType = {
  activeMidiNotes: Set<string>;
  midiConnected: boolean;
  midiDevices: string[];
};

const MidiContextContext = createContext<MidiContextType | null>(null);

export const MidiProvider = ({ children }: React.PropsWithChildren) => {
  const {
    selectedSampleId,
    allSampleData,
    setAllSampleData,
    samplersRef,
    loopIsPlaying,
    isRecording,
    currentLoop,
  } = useAudioContext();

  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<string>>(
    new Set()
  );
  // Tracks active (held) notes for polyphonic recording; keyed by note name
  const activeNotesRef = useRef<Map<string, SampleEventFE>>(new Map());
  // Tracks auto-release timers for end-capped notes; keyed by note name
  const activeReleaseTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear active notes and release timers when the selected sample changes
  useEffect(() => {
    activeNotesRef.current.clear();
    activeReleaseTimersRef.current.forEach((timer) => clearTimeout(timer));
    activeReleaseTimersRef.current.clear();
  }, [selectedSampleId]);

  const onNoteOn = (note: string, velocity: number) => {
    const samplerWithFX = samplersRef.current[selectedSampleId];
    if (!samplerWithFX) return;

    const { sampler } = samplerWithFX;
    const { start, end } = allSampleData[selectedSampleId].settings;
    sampler.triggerAttack(note, Tone.now(), start, velocity);

    setActiveMidiNotes((prev) => {
      const next = new Set(prev);
      next.add(note);
      return next;
    });

    if (end) {
      const duration = (end - start) / calcPlaybackRate(note as Tone.Unit.Frequency);
      const timer = setTimeout(() => {
        sampler.triggerRelease(note, Tone.now());
        setActiveMidiNotes((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
        activeNotesRef.current.delete(note);
        activeReleaseTimersRef.current.delete(note);
      }, duration * 1000);
      activeReleaseTimersRef.current.set(note, timer);
    }

    if (loopIsPlaying && isRecording) {
      activeNotesRef.current.set(note, {
        startTime: Tone.getTransport().ticks,
        duration: 0,
        note,
        velocity,
      });
    }
  };

  const onNoteOff = (note: string) => {
    const samplerWithFX = samplersRef.current[selectedSampleId];
    if (!samplerWithFX) return;

    const { sampler } = samplerWithFX;

    const timer = activeReleaseTimersRef.current.get(note);
    if (timer) {
      clearTimeout(timer);
      activeReleaseTimersRef.current.delete(note);
    }

    sampler.triggerRelease(note, Tone.now());

    setActiveMidiNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });

    const activeNote = activeNotesRef.current.get(note);
    if (!activeNote?.startTime || !isRecording) return;

    const duration = calcEventDuration(
      activeNote.startTime as number,
      Tone.getTransport().loopEnd as Tone.Unit.Time,
      allSampleData[selectedSampleId].settings.end
    );

    const completedEvent: SampleEventFE = {
      ...activeNote,
      duration,
    };

    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: {
        ...prev[selectedSampleId],
        events: {
          ...prev[selectedSampleId].events,
          [currentLoop]: [
            ...(prev[selectedSampleId].events[currentLoop] || []),
            completedEvent,
          ],
        },
      },
    }));

    activeNotesRef.current.delete(note);
  };

  const { isConnected, inputDevices } = useMidi({ onNoteOn, onNoteOff });

  return (
    <MidiContextContext.Provider
      value={{
        activeMidiNotes,
        midiConnected: isConnected,
        midiDevices: inputDevices,
      }}
    >
      {children}
    </MidiContextContext.Provider>
  );
};

export const useMidiContext = () => {
  const context = useContext(MidiContextContext);
  if (!context) {
    throw new Error("useMidiContext must be used within a MidiProvider");
  }
  return context;
};
