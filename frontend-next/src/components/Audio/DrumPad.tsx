"use client";
import { useCallback, forwardRef, useImperativeHandle } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import { useMidiContext } from "../../app/contexts/MidiContext";
import AudioSnippetVisualizer from "./AudioSnippetVisualizer";
import { drumKeys, getKeySymbol } from "src/lib/constants/drumKeys";
import useDrumPadHotKeys from "src/app/hooks/useDrumPadHotKeys";
import { resolvePlayNote } from "src/lib/audio/util/resolvePlayNote";
import { useEngine, usePadPlaying } from "src/lib/engine/react";
import { usePad } from "src/lib/song/react";
import styles from "./DrumPad.module.css";
import { padNumber } from "src/lib/constants/padLayout";

type DrumPadProps = {
  id: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
};

const DrumPad = forwardRef(function DrumPad(
  { id, buttonRef }: DrumPadProps,
  ref
) {
  const { setSelectedSampleId, selectedSampleId } = useAudioContext();
  const engine = useEngine();
  const pad = usePad(id);
  const sampleIsPlaying = usePadPlaying(id);
  const { baseNote } = pad.settings;
  const { hotKeysActive } = useUIContext();
  const { activeMidiNotes } = useMidiContext();
  const padNum = padNumber(id);
  const padKey = drumKeys[padNum - 1];

  // Drum pads always play at natural pitch: baseNote resolved against itself
  // is C4. See resolvePlayNote.ts
  const playNote = resolvePlayNote(String(baseNote), String(baseNote));

  // The engine owns the sound and records the hit; see liveInput.ts
  const handlePress = useCallback(() => {
    engine.send({ type: "press", padId: id, note: playNote, velocity: 1 });
    setSelectedSampleId(id);
  }, [engine, id, playNote, setSelectedSampleId]);

  const handleRelease = useCallback(() => {
    engine.send({ type: "release", padId: id, note: playNote });
  }, [engine, id, playNote]);

  const handleFocus = () => {
    setSelectedSampleId(id);
  };

  useDrumPadHotKeys({
    hotKeysActive,
    padKey,
    onPress: handlePress,
    onRelease: handleRelease,
  });

  // Get the color of the pad based on its mute/solo settings
  const getPadColor = () => {
    if (pad.settings.mute) return styles.muted;
    if (pad.settings.solo) return styles.soloed;
    return "";
  };

  const getActiveStyle = () => {
    const isActive =
      sampleIsPlaying || (id === selectedSampleId && activeMidiNotes.size > 0);
    return isActive ? styles.active : "";
  };

  const isSelected = selectedSampleId === id;

  useImperativeHandle(ref, () => ({
    handlePress,
    handleRelease,
  }));

  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.selected : ""}`}
      onFocus={handleFocus}
    >
      <button
        id={String(padNum)}
        ref={buttonRef}
        onMouseDown={handlePress}
        onMouseEnter={(e) => {
          if (e.buttons === 1) {
            handlePress();
          }
        }}
        onMouseUp={handleRelease}
        onMouseLeave={() => handleRelease()}
        // Disable touch default behavior. Handle touch events in DrumMachine.tsx
        onTouchStart={(e) => {
          e.preventDefault();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
        }}
        className={`${styles.pad} ${getPadColor()} ${getActiveStyle()}`}
      >
        <div className={styles.labels}>
          <span className={styles.number}>{padNum}</span>
          <span className={styles.key}>
            {hotKeysActive ? getKeySymbol(padKey) : ""}
          </span>
        </div>
        <AudioSnippetVisualizer url={pad.url} />
      </button>
    </div>
  );
});

export default DrumPad;
