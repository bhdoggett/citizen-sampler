"use client";
import { useState, useRef } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import PitchPad from "./PitchPad";
import { usePad } from "src/lib/song/react";
import useTouchPads, { type PadHandlers } from "src/app/hooks/useTouchPads";
import { useHostContext } from "src/lib/engine/react";
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
  const host = useHostContext();
  const needsMultiOut = host.isPlugin && host.layout === "kit";
  const [scale, setScale] = useState<ScaleName>("chromatic");

  const gridNotes = generateScaleNotes(String(baseNote), scale);

  useTouchPads(pitchPadsRef, pitchPadsHandlersRef);

  return (
    <div
      className={`${styles.pitchGrid} ${needsMultiOut ? styles.unavailable : ""}`}
    >
      {needsMultiOut && (
        <p className={styles.note}>
          Pitched notes need the 16-output layout. In mono or stereo, each MIDI note
          plays a different pad.
        </p>
      )}
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
                disabled={needsMultiOut}
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
