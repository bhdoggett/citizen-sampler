import * as Tone from "tone";
import { Frequency } from "tone/build/esm/core/type/Units";

const NUM_ROWS = 5;
const NUM_COLS = 5;

// MIDI note numbers for C4 to C6 = 60 to 84

const midiToNoteName = (midi: number) => Tone.Frequency(midi, "midi").toNote();

type PitchGridProps = {
  baseNote: Frequency;
  handlePress: (note: Frequency) => void;
  handleRelease: (note: Frequency) => void;
};

const PitchGrid: React.FC<PitchGridProps> = ({
  baseNote,
  handlePress,
  handleRelease,
}) => {
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

  return (
    <div className="w-full grid grid-cols-5 gap-0 border-2 border-black mt-3">
      {gridNotes.flat().map((note, i) => (
        <button
          key={note + i}
          onMouseDown={() => handlePress(note)}
          onTouchStart={() => handlePress(note)}
          onDragOver={() => handlePress(note)}
          onMouseUp={() => handleRelease(note)}
          onMouseLeave={() => handleRelease(note)}
          onTouchEnd={() => handleRelease(note)}
          className={`border border-black text-sm cursor-pointer aspect-square ${note === baseNote ? "bg-slate-400" : "bg-slate-300"}`}
        >
          {note}
        </button>
      ))}
    </div>
  );
};

export default PitchGrid;
