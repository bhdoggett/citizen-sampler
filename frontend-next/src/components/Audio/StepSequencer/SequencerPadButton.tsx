"use client";
import { useCallback } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import { drumKeys, getKeySymbol } from "src/lib/constants/drumKeys";
import { resolvePlayNote } from "src/lib/audio/util/resolvePlayNote";
import { useEngine, useNotePlaying } from "src/lib/engine/react";
import { usePad } from "src/lib/song/react";
import styles from "./SequencerPadButton.module.css";

type SequencerPadButtonProps = {
  padId: string;
  padNumber: number;
  overrideNote?: string;
};

const SequencerPadButton: React.FC<SequencerPadButtonProps> = ({
  padId,
  padNumber,
  overrideNote,
}) => {
  const { setSelectedSampleId } = useAudioContext();
  const { hotKeysActive } = useUIContext();
  const engine = useEngine();
  const { baseNote } = usePad(padId).settings;

  // overrideNote is pre-resolved by the parent; for drum mode (no
  // overrideNote) resolve baseNote against itself, which is C4
  const noteToPlay = overrideNote ?? resolvePlayNote(String(baseNote), String(baseNote));
  // Lights up however the note is played: here, from the hotkey or by playback
  const isPressed = useNotePlaying(padId, noteToPlay);
  const padKey = drumKeys[padNumber - 1];

  // The engine owns the sound and records the hit; see liveInput.ts
  const handlePress = useCallback(() => {
    engine.send({ type: "press", padId, note: noteToPlay, velocity: 1 });
    setSelectedSampleId(padId);
  }, [engine, padId, noteToPlay, setSelectedSampleId]);

  const handleRelease = useCallback(() => {
    engine.send({ type: "release", padId, note: noteToPlay });
  }, [engine, padId, noteToPlay]);

  return (
    <button
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      className={`${styles.padButton} ${isPressed ? styles.pressed : ""}`}
      title={
        overrideNote
          ? `Play ${overrideNote}`
          : `Play pad ${padNumber} (${hotKeysActive ? getKeySymbol(padKey) : padKey})`
      }
    >
      {overrideNote ? "▶" : hotKeysActive ? getKeySymbol(padKey) : ""}
    </button>
  );
};

export default SequencerPadButton;
