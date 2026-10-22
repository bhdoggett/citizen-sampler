"use client";
import { useState, useEffect, useRef } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { CustomSampler } from "src/types/CustomSampler";
import PitchPad from "./PitchPad";
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
  const [scale, setScale] = useState<ScaleName>("chromatic");
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  const gridNotes = generateScaleNotes(String(baseNote), scale);

  useEffect(() => {
    const getPadNoteFromTouch = (touch: Touch) => {
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetEl) return null;
      return (
        Object.entries(pitchPadsRef.current).find(([, el]) =>
          el?.contains(targetEl),
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
