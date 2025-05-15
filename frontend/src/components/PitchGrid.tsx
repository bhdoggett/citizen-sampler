import React, { useState, useRef } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../app/contexts/AudioContext";
import type { SampleType } from "@shared/types/audioTypes";

const NUM_ROWS = 8;
const NUM_COLS = 8;

// MIDI note numbers for C4 to C6 = 60 to 84

const TOTAL_BUTTONS = NUM_ROWS * NUM_COLS;

const midiToNoteName = (midi: number) => Tone.Frequency(midi, "midi").toNote();

type PitchGridProps = {
  id: string;
};

const PitchGrid: React.FC<PitchGridProps> = ({ id }) => {
  const {
    samplersRef,
    selectedSampleId,
    allSampleData,
    loopIsPlaying,
    isRecording,
    setAllSampleData,
    currentLoop,
  } = useAudioContext();
  const BASE_NOTE = Tone.Frequency(
    allSampleData[id].settings.baseNote
  ).toMidi();
  const sampleData: SampleType = allSampleData[id];
  const sampler = samplersRef.current[selectedSampleId].sampler;
  const { currentEvent } = samplersRef.current[id];
  const [pitchIsPlaying, setPitchIsPlaying] = useState(false);
  const scheduledReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReleasedRef = useRef(false);

  // Define root position (row 5, col 3, zero-indexed)
  const rootRow = NUM_ROWS - 3; // row 5
  const rootCol = 3; // col 3

  // Generate the note grid starting from root in middle
  const generateNotes = () => {
    const notes: string[][] = [];
    const rootIndex = rootRow * NUM_COLS + rootCol;

    for (let row = 0; row < NUM_ROWS; row++) {
      const rowNotes: string[] = [];
      for (let col = 0; col < NUM_COLS; col++) {
        const index = row * NUM_COLS + col;
        const midi = BASE_NOTE + (index - rootIndex);
        rowNotes.push(midiToNoteName(midi));
      }
      notes.push(rowNotes);
    }

    return notes;
  };

  const gridNotes = generateNotes();

  const handlePressPitch = (note: string) => {
    const now = Tone.now();
    const { start, end } = sampleData.settings;

    hasReleasedRef.current = false;
    sampler.triggerAttack(note, now, start);

    setPitchIsPlaying(true);

    if (end) {
      const duration = end - start;
      scheduledReleaseTimeoutRef.current = setTimeout(() => {
        if (!hasReleasedRef.current) {
          hasReleasedRef.current = true;
          sampler.triggerRelease(note, Tone.now());
          setPitchIsPlaying(false);
        }
      }, duration * 1000);
    }

    if (loopIsPlaying && isRecording) {
      currentEvent.startTime = Tone.getTransport().ticks;
      currentEvent.duration = 0;
    }
  };

  const handleReleasePitch = (note: string) => {
    if (!pitchIsPlaying) return;

    // Stop scheduled release
    if (scheduledReleaseTimeoutRef.current) {
      clearTimeout(scheduledReleaseTimeoutRef.current);
      scheduledReleaseTimeoutRef.current = null;
    }

    hasReleasedRef.current = true;
    setPitchIsPlaying(false);
    sampler.triggerRelease(note, Tone.now());

    if (
      // !currentEvent ||
      !currentEvent.startTime ||
      !loopIsPlaying ||
      !isRecording
    )
      return;

    const padReleasetime = Tone.getTransport().seconds;
    const sampleEnd = allSampleData[selectedSampleId].settings.end;

    const actualReleaseTime = sampleEnd
      ? padReleasetime < sampleEnd
        ? padReleasetime
        : sampleEnd
      : padReleasetime;

    const startTimeInSeconds = Tone.Ticks(currentEvent.startTime).toSeconds();

    currentEvent.duration =
      actualReleaseTime > startTimeInSeconds
        ? actualReleaseTime - startTimeInSeconds
        : Tone.Time(Tone.getTransport().loopEnd).toSeconds() -
          startTimeInSeconds +
          actualReleaseTime;

    console.log("currentEvent.duration", currentEvent.duration);
    sampleData.events[currentLoop].push({ ...currentEvent });
    setAllSampleData((prev) => ({ ...prev, [id]: sampleData }));

    if (loopIsPlaying && isRecording && currentEvent.duration === 0) {
    }
  };

  return (
    <div
      className="grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${NUM_COLS}, 1fr)`,
        gap: "4px",
      }}
    >
      {gridNotes.flat().map((note, i) => (
        <button
          key={note + i}
          onMouseDown={() => handlePressPitch(note)}
          onTouchStart={() => handlePressPitch(note)}
          onMouseUp={() => handleReleasePitch(note)}
          onMouseLeave={() => handleReleasePitch(note)}
          onTouchEnd={() => handleReleasePitch(note)}
          className={`${note === midiToNoteName(BASE_NOTE) ? "#88f" : "#ccc"}${i === 0 ? "border-2 border-black" : ""}`}
          style={{
            padding: "20px",
            background: note === midiToNoteName(BASE_NOTE) ? "#88f" : "#ccc",
            border: "1px solid #999",
            borderRadius: "4px",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          {note}
        </button>
      ))}
    </div>
  );
};

export default PitchGrid;
