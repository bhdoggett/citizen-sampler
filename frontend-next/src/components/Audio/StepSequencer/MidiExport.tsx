"use client";
import { useMemo, useRef } from "react";
import { Download, GripVertical } from "lucide-react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { useEngine, useHostContext } from "src/lib/engine/react";
import { useAllSamples, useLoops } from "src/lib/song/react";
import { buildMidiFile, type MidiExportUnit } from "src/lib/midi/buildMidiFile";
import type { Samples } from "src/lib/song/store";
import styles from "./MidiExport.module.css";

const PITCH_DROPPED = "Pitch dropped: kit layout plays each pad at its own pitch.";
// Pixels the pointer must travel before a press becomes a drag
const DRAG_THRESHOLD = 4;

type MidiExportProps = {
  unit: MidiExportUnit;
  // Icons only, for a sequencer row
  compact?: boolean;
};

// Seconds for a hit recorded without a length: the pad's trimmed sample, or
// a sixteenth note when it plays to the end of the file
function fallbackDuration(samples: Samples, bpm: number) {
  return (padId: string) => {
    const settings = samples[padId]?.settings;
    if (settings && settings.end !== null) return Math.max(0, settings.end - settings.start);
    return 60 / bpm / 4;
  };
}

const MidiExport: React.FC<MidiExportProps> = ({ unit, compact = false }) => {
  const engine = useEngine();
  const host = useHostContext();
  const { songTitle, currentLoop } = useAudioContext();
  const samples = useAllSamples();
  const loops = useLoops();
  const loopSettings = loops[currentLoop];

  const bpm = host.isPlugin && host.tempo ? host.tempo : loopSettings?.bpm;
  // The web and the standalone app always keep pitch
  const layout = host.isPlugin ? host.layout : "multiOut";
  // A plain value, so a new unit object each render keeps the memo
  const unitPad = unit.kind === "pad" ? unit.padId : null;

  const midi = useMemo(() => {
    if (!loopSettings || !bpm) return null;
    return buildMidiFile({
      samples,
      loop: currentLoop,
      loopSettings,
      bpm,
      layout,
      unit: unitPad ? { kind: "pad", padId: unitPad } : { kind: "kit" },
      fallbackDuration: fallbackDuration(samples, bpm),
    });
  }, [samples, currentLoop, loopSettings, bpm, layout, unitPad]);

  const fileName = `${songTitle || "citizen-sampler"}-loop-${currentLoop}${
    unitPad ? `-${unitPad}` : ""
  }.mid`;

  const pressedAt = useRef<{ x: number; y: number } | null>(null);

  const handleExport = () => {
    if (!midi) return;
    engine.saveMidi(fileName, midi.bytes).catch((error) => {
      console.error("Failed to export MIDI:", error);
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    pressedAt.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = pressedAt.current;
    if (!start || !midi) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
    pressedAt.current = null;
    engine.dragMidi?.(fileName, midi.bytes);
  };

  const handlePointerEnd = () => {
    pressedAt.current = null;
  };

  return (
    <div className={`${styles.export} ${compact ? styles.compact : ""}`}>
      <div className={styles.segment}>
        <button
          className={styles.button}
          onClick={handleExport}
          disabled={!midi}
          aria-label="Export MIDI"
          title={compact ? "Export this pad's loop as MIDI" : "Export this loop as MIDI"}
        >
          <Download size={14} />
          {!compact && "MIDI"}
        </button>
        {engine.dragMidi && (
          <button
            className={`${styles.button} ${styles.handle}`}
            disabled={!midi}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            aria-label="Drag MIDI"
            title="Drag into your DAW"
          >
            <GripVertical size={14} />
          </button>
        )}
      </div>
      {midi?.droppedPitch &&
        (compact ? (
          <span className={styles.flag} title={PITCH_DROPPED} aria-label={PITCH_DROPPED}>
            !
          </span>
        ) : (
          <span className={styles.note}>{PITCH_DROPPED}</span>
        ))}
    </div>
  );
};

export default MidiExport;
