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

const PitchGrid: React.FC<PitchGridProps> = ({ sampler }) => {
  const { selectedSampleId, allSampleData, samplersRef } = useAudioContext();
  const sampleDataRef = useRef(allSampleData[selectedSampleId]);
  const { baseNote } = allSampleData[selectedSampleId].settings;

  // test
  useEffect(() => {
    if (sampler) {
      console.log("Sampler loaded and ready to use", sampler);
    }
  }, [sampler]);

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
    <div className="w-1/2 grid grid-cols-5 gap-0 border-2 border-black mt-3">
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
  );
};

export default PitchGrid;
