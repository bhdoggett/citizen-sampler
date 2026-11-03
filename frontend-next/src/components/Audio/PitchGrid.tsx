"use client";
import { useState, useRef } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import PitchPad from "./PitchPad";
import { usePad } from "src/lib/song/react";
import useTouchPads, { type PadHandlers } from "src/app/hooks/useTouchPads";
import styles from "./PitchGrid.module.css";
import {
  type ScaleName,
  generateScaleNotes,
} from "src/lib/audio/util/scaleNotes";

const SCALES: { name: ScaleName; label: string }[] = [
  { name: "chromatic", label: "Chromatic" },
  { name: "major", label: "Major" },
  { name: "minor", label: "Minor" },
  { name: "pentatonic", label: "Pentatonic" },
];

const PitchGrid: React.FC = () => {
  const { selectedSampleId } = useAudioContext();
  const { baseNote } = usePad(selectedSampleId).settings;
  const pitchPadsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const pitchPadsHandlersRef = useRef<Record<string, PadHandlers | null>>({});
  const [scale, setScale] = useState<ScaleName>("chromatic");

  const gridNotes = generateScaleNotes(String(baseNote), scale);

  useTouchPads(pitchPadsRef, pitchPadsHandlersRef);

  return (
    <div className={styles.pitchGrid}>
      <div className={styles.scaleTabs}>
        {SCALES.map(({ name, label }) => (
          <button
            key={name}
            className={`${styles.scaleTab} ${scale === name ? styles.scaleTabActive : ""}`}
            onClick={() => setScale(name)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
          {gridNotes.map((note, i) => {
            return (
              <PitchPad
                key={`${note}-${i}`}
                note={note}
                pitchPadsRef={pitchPadsRef}
                ref={(el) => {
                  pitchPadsHandlersRef.current[note] = el as PadHandlers | null;
                }}
              />
            );
          })}
      </div>
    </div>
  );
};

export default PitchGrid;
