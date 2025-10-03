
import { useState, useEffect, useRef } from "react";
import { useAudioContext } from "../../contexts/AudioContext";
import { CustomSampler } from "../../types/CustomSampler";
import * as Tone from "tone";
import PitchPad from "./PitchPad";

// Convert MIDI number to note name
const midiToNoteName = (midi: number) => Tone.Frequency(midi, "midi").toNote();

// Define offset arrays for each scale.
// Each sub array represents a row in the grid, arranged to more easily visualize the resulting Pitch Grid.
// the base note is the center index on the center inner-array.
const chromaticOffsets = [
  [8, 9, 10, 11, 12],
  [3, 4, 5, 6, 7],
  [-2, -1, 0, 1, 2],
  [-7, -6, -5, -4, -3],
  [-12, -11, -10, -9, -8],
];

const majorOffsets = [
  [14, 16, 17, 19, 21],
  [5, 7, 9, 11, 12],
  [-3, -1, 0, 2, 4],
  [-12, -10, -8, -7, -5],
  [-20, -19, -17, -15, -13],
];
const minorOffsets = [
  [14, 15, 17, 19, 20],
  [5, 7, 8, 10, 12],
  [-4, -2, 0, 2, 3],
  [-12, -10, -9, -7, -5],
  [-21, -19, -17, -16, -14],
];
const pentatonicOffsets = [
  [19, 21, 24, 26, 28],
  [7, 9, 12, 14, 16],
  [-5, -3, 0, 2, 4],
  [-17, -15, -12, -10, -8],
  [-29, -27, -24, -22, -20],
];

const scaleOffsets = {
  chromatic: chromaticOffsets,
  major: majorOffsets,
  minor: minorOffsets,
  pentatonic: pentatonicOffsets,
};

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
  const [scale, setScale] = useState<keyof typeof scaleOffsets>("chromatic");
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  // Generate the note grid using the offset array
  const generateNotes = () => {
    const offsets = scaleOffsets[scale].flat();
    const notes: string[] = [];
    const baseMidi = Tone.Frequency(baseNote).toMidi();
    for (let i = 0; i < 25; i++) {
      const midi = baseMidi + offsets[i];
      notes.push(midiToNoteName(midi));
    }
    return notes;
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
    <div className="relative w-full max-w-[400px] border-2 border-black flex flex-col bg-white ml-1 mt-1">
      <div className="flex-none">
        <h3 className="bg-slate-50 font-bold border-b-2 border-black shadow-inner shadow-slate-400 w-full text-center">{`Pitch Grid: ${selectedSampleId}`}</h3>
        <div className="flex w-full text-xs">
          <button
            className={`font-bold border-l border-b border-black shadow-inner w-full shadow-slate-800 ${scale === "chromatic" ? "bg-slate-600 text-white" : "bg-slate-50 text-black"}`}
            onClick={() => setScale("chromatic")}
          >
            Chromatic
          </button>
          <button
            className={`font-bold border-l border-b border-black shadow-inner w-full shadow-slate-800 ${scale === "major" ? "bg-slate-600 text-white" : "bg-slate-50 text-black"}`}
            onClick={() => setScale("major")}
          >
            Major
          </button>
          <button
            className={`font-bold border-l border-b border-black shadow-inner w-full shadow-slate-800 ${scale === "minor" ? "bg-slate-600 text-white" : "bg-slate-50 text-black"}`}
            onClick={() => setScale("minor")}
          >
            Minor
          </button>
          <button
            className={`font-bold border-x border-b border-black shadow-inner w-full shadow-slate-800 ${scale === "pentatonic" ? "bg-slate-600 text-white" : "bg-slate-50 text-black"}`}
            onClick={() => setScale("pentatonic")}
          >
            Pentatonic
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full h-full grid grid-cols-5 gap-0 touch-none select-none">
          {gridNotes.map((note, i) => {
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
    </div>
  );
};

export default PitchGrid;
