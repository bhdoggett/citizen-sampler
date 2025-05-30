"use client";
import { useEffect, useRef } from "react";
import { useAudioContext } from "frontend/src/app/contexts/AudioContext";
import { CustomSampler } from "frontend/src/types/CustomSampler";
import * as Tone from "tone";
import PitchPad from "./PitchPad";

const NUM_ROWS = 5;
const NUM_COLS = 5;

// MIDI note numbers for C4 to C6 = 60 to 84

const midiToNoteName = (midi: number) => Tone.Frequency(midi, "midi").toNote();

type PitchGridProps = {
  sampler: CustomSampler | null;
};

const PitchGrid: React.FC<PitchGridProps> = () => {
  const { selectedSampleId, allSampleData, samplersRef } = useAudioContext();
  const sampleDataRef = useRef(allSampleData[selectedSampleId]);
  const { baseNote } = allSampleData[selectedSampleId].settings;

  // Define root position (row 5, col 3, zero-indexed)
  const rootRow = NUM_ROWS - 3; // row 5
  const rootCol = 2; // col 3

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
    sampleDataRef.current = allSampleData[selectedSampleId];
  }, [allSampleData, selectedSampleId]);

  return (
    <div className="flex flex-col text-center w-1/2 ml-3 mt-1">
      <h3 className="bg-slate-50 font-bold border-2 border-black shadow-inner shadow-slate-400">{`Pitch Grid: ${selectedSampleId}`}</h3>
      <div className="w-full aspect-square grid grid-cols-5 gap-0 border-2 border-black mt-1 mx-auto">
        {gridNotes.flat().map((note, i) => {
          const samplerObj = samplersRef.current[selectedSampleId];
          return (
            <PitchPad
              key={`${note}-${i}`}
              note={note}
              sampler={samplerObj?.sampler ?? null}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PitchGrid;
