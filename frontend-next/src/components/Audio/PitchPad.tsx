"use client";
import { forwardRef, useCallback, useImperativeHandle } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useMidiContext } from "../../app/contexts/MidiContext";
import { resolvePlayNote } from "../../lib/audio/util/resolvePlayNote";
import { useEngine, useNotePlaying, usePadPlaying } from "src/lib/engine/react";
import { usePad } from "src/lib/song/react";
import styles from "./PitchPad.module.css";

type PitchPadProps = {
  note: string;
  pitchPadsRef: React.RefObject<Record<string, HTMLButtonElement | null>>;
};

// Plays the selected pad's sample at one pitch
const PitchPad = forwardRef(function PitchPad(
  { note, pitchPadsRef }: PitchPadProps,
  ref
) {
  const { selectedSampleId } = useAudioContext();
  const engine = useEngine();
  const { activeMidiNotes } = useMidiContext();
  const { baseNote } = usePad(selectedSampleId).settings;

  // Transpose relative to the C4 reference; see resolvePlayNote.ts
  const playNote = resolvePlayNote(note, String(baseNote));
  const pitchIsPlaying = useNotePlaying(selectedSampleId, playNote);

  // The root note also lights up while the pad is played from the drum pads
  // or sequencer, since that plays the sample at its base note
  const isRootNote = note === baseNote;
  const rootPadPlaying = usePadPlaying(isRootNote ? selectedSampleId : null);

  // The engine owns the sound and records the hit; see liveInput.ts
  const handlePress = useCallback(() => {
    engine.send({ type: "press", padId: selectedSampleId, note: playNote, velocity: 1 });
  }, [engine, selectedSampleId, playNote]);

  const handleRelease = useCallback(() => {
    engine.send({ type: "release", padId: selectedSampleId, note: playNote });
  }, [engine, selectedSampleId, playNote]);

  const isActive = pitchIsPlaying || rootPadPlaying || activeMidiNotes.has(note);

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
      className={`${styles.pitchPad} ${isRootNote ? styles.baseNote : ""} ${isActive ? styles.active : ""}`}
    >
      {note}
    </button>
  );
});

export default PitchPad;
