"use client";
import { createContext, useContext, useRef, useState } from "react";
import { useAudioContext } from "./AudioContext";
import { useMidi } from "../hooks/useMidi";
import { resolvePlayNote } from "../../lib/audio/util/resolvePlayNote";
import { useEngine } from "src/lib/engine/react";
import { useSongStore } from "src/lib/song/react";

type MidiContextType = {
  activeMidiNotes: Set<string>;
  midiConnected: boolean;
  midiDevices: string[];
};

const MidiContextContext = createContext<MidiContextType | null>(null);

// MIDI keys play the selected pad chromatically. The engine owns the sound
// and records the hits; this only routes notes to it.
export const MidiProvider = ({ children }: React.PropsWithChildren) => {
  const { selectedSampleId } = useAudioContext();
  const engine = useEngine();
  const store = useSongStore();

  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<string>>(
    new Set()
  );
  // Where each held key went, so note-off reaches the same pad and trigger
  // note even if the selection or base note changed while it was held
  const routesRef = useRef<Map<string, { padId: string; playNote: string }>>(new Map());

  const onNoteOn = (note: string, velocity: number) => {
    const pad = store.getState().samples[selectedSampleId];
    if (!pad) return;

    // Transpose relative to C4 reference — see resolvePlayNote.ts
    const playNote = resolvePlayNote(note, String(pad.settings.baseNote));
    routesRef.current.set(note, { padId: selectedSampleId, playNote });
    engine.send({ type: "press", padId: selectedSampleId, note: playNote, velocity });

    // Keyed by raw note for the highlight on PitchPads
    setActiveMidiNotes((prev) => new Set(prev).add(note));
  };

  const onNoteOff = (note: string) => {
    const route = routesRef.current.get(note);
    routesRef.current.delete(note);
    if (route) engine.send({ type: "release", padId: route.padId, note: route.playNote });

    setActiveMidiNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
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
