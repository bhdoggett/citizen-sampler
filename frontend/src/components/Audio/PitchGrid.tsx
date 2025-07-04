"use client";
import { useState, useEffect, useRef } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { CustomSampler } from "src/types/CustomSampler";
import * as Tone from "tone";
import PitchPad from "./PitchPad";

const NUM_ROWS = 5;
const NUM_COLS = 5;

// Convert MIDI number to note name
const midiToNoteName = (midi: number) => Tone.Frequency(midi, "midi").toNote();

type PitchGridProps = {
  sampler: CustomSampler | null;
};

const PitchGrid: React.FC<PitchGridProps> = () => {
  const { selectedSampleId, allSampleData, samplersRef } = useAudioContext();
  const { baseNote } = allSampleData[selectedSampleId].settings;
  const pitchPadsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  // Rename pitchPadComponentRefs to pitchPadsHandlersRef
  const pitchPadsHandlersRef = useRef<
    Record<
      string,
      { handlePress: () => void; handleRelease: () => void } | null
    >
  >({});
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  // Define root position (row 3, col 3, zero-indexed)
  const rootRow = NUM_ROWS - 3; // row 3
  const rootCol = NUM_COLS - 3; // col 3

  // Generate the note grid starting from root in middle
  const generateNotes = () => {
    const notes: string[][] = [];
    const rootIndex = rootRow * NUM_COLS + rootCol;

    for (let row = 0; row < NUM_ROWS; row++) {
      const rowNotes: string[] = [];
      for (let col = 0; col < NUM_COLS; col++) {
        const index = row * NUM_COLS + col;
        const midi = Tone.Frequency(baseNote).toMidi() + (index - rootIndex);
        rowNotes.push(midiToNoteName(midi));
      }
      notes.push(rowNotes);
    }

    return notes.reverse();
  };

  const gridNotes = generateNotes();

  useEffect(() => {
    const getPadNoteFromTouch = (touch: Touch) => {
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetEl) return null;
      return (
        Object.entries(pitchPadsRef.current).find(([, el]) =>
          el?.contains(targetEl)
        )?.[0] || null
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touches = Array.from(e.touches);
      const newActiveNotes = new Set<string>();

      // Process all touches
      touches.forEach((touch) => {
        const padNote = getPadNoteFromTouch(touch);
        if (padNote) {
          newActiveNotes.add(padNote);
          if (!activeNotes.has(padNote)) {
            pitchPadsHandlersRef.current[padNote]?.handlePress();
          }
        }
      });

      // Release notes that are no longer active
      activeNotes.forEach((note) => {
        if (!newActiveNotes.has(note)) {
          pitchPadsHandlersRef.current[note]?.handleRelease();
        }
      });

      setActiveNotes(newActiveNotes);
    };

    const handleTouchMove = (e: TouchEvent) => {
      // If multiple touches, disable touchmove tracking
      if (e.touches.length > 1) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;
      const padNote = getPadNoteFromTouch(touch);
      const newActiveNotes = new Set<string>();

      if (padNote) {
        newActiveNotes.add(padNote);
        if (!activeNotes.has(padNote)) {
          pitchPadsHandlersRef.current[padNote]?.handlePress();
        }
      }

      // Release notes that are no longer active
      activeNotes.forEach((note) => {
        if (!newActiveNotes.has(note)) {
          pitchPadsHandlersRef.current[note]?.handleRelease();
        }
      });

      setActiveNotes(newActiveNotes);
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      // Release all active notes
      activeNotes.forEach((note) => {
        pitchPadsHandlersRef.current[note]?.handleRelease();
      });
      setActiveNotes(new Set());
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeNotes]);

  return (
    <div className="flex flex-col text-center w-1/2 ml-3 mt-1">
      <h3 className="bg-slate-50 font-bold border-2 border-black shadow-inner shadow-slate-400">{`Pitch Grid: ${selectedSampleId}`}</h3>
      <div className="w-full aspect-square grid grid-cols-5 gap-0 border-2 border-black mt-1 mx-auto touch-none select-none">
        {gridNotes.flat().map((note, i) => {
          const samplerObj = samplersRef.current[selectedSampleId];
          return (
            <PitchPad
              key={`${note}-${i}`}
              note={note}
              sampler={samplerObj?.sampler ?? null}
              pitchPadsRef={pitchPadsRef}
              ref={(el) => {
                pitchPadsHandlersRef.current[note] = el as {
                  handlePress: () => void;
                  handleRelease: () => void;
                } | null;
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PitchGrid;
