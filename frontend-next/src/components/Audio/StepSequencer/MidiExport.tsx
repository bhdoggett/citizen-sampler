"use client";
import { useRef, useState } from "react";
import { Download, GripVertical } from "lucide-react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import {
  useEffectiveLoopSettings,
  useEngine,
  useHostContext,
  usePadDurations,
} from "src/lib/engine/react";
import { useLoops, useSongSelector, useSongStore } from "src/lib/song/react";
import { buildMidiFile, type MidiExportUnit } from "src/lib/midi/buildMidiFile";
import type { Samples } from "src/lib/song/store";
import type { LoopName } from "src/types/audioTypes";
import styles from "./MidiExport.module.css";

const PITCH_DROPPED = "Pitch dropped: kit layout plays each pad at its own pitch.";
// Pixels the pointer must travel before a press becomes a drag
const DRAG_THRESHOLD = 4;

type MidiExportProps = {
  unit: MidiExportUnit;
  // Icons only, for a sequencer row
  compact?: boolean;
};

// Seconds for a hit recorded without a length: the rest of the pad's sample
// from its start point (or its trimmed part), or a sixteenth note while the
// sample has not loaded
function fallbackDuration(samples: Samples, durations: Record<string, number>, bpm: number) {
  return (padId: string) => {
    const settings = samples[padId]?.settings;
    const sampleLength = durations[padId];
    if (settings && settings.end !== null) return Math.max(0, settings.end - settings.start);
    if (sampleLength !== undefined) return Math.max(0, sampleLength - (settings?.start ?? 0));
    return 60 / bpm / 4;
  };
}

// Cheap check for the Export button; the file itself is built on demand
function hasHits(samples: Samples, loop: LoopName, padId: string | null): boolean {
  const pads = padId ? [samples[padId]] : Object.values(samples);
  return pads.some((pad) => pad?.events[loop]?.some((event) => event.startTime !== null));
}

const MidiExport: React.FC<MidiExportProps> = ({ unit, compact = false }) => {
  const engine = useEngine();
  const host = useHostContext();
  const padDurations = usePadDurations();
  const store = useSongStore();
  const { songTitle, currentLoop } = useAudioContext();
  const loopSettings = useEffectiveLoopSettings(useLoops()[currentLoop]);
  const unitPad = unit.kind === "pad" ? unit.padId : null;
  const canExport = useSongSelector((state) => hasHits(state.samples, currentLoop, unitPad));
  // Known after an export or drag, from that file
  const [droppedPitch, setDroppedPitch] = useState(false);

  const fileName = `${songTitle || "citizen-sampler"}-loop-${currentLoop}${
    unitPad ? `-${unitPad}` : ""
  }.mid`;

  const build = () => {
    const bpm = loopSettings?.bpm;
    if (!loopSettings || !bpm) return null;
    const { samples } = store.getState();
    const midi = buildMidiFile({
      samples,
      loop: currentLoop,
      loopSettings,
      bpm,
      // The web and the standalone app always keep pitch
      layout: host.isPlugin ? host.layout : "multiOut",
      unit: unitPad ? { kind: "pad", padId: unitPad } : { kind: "kit" },
      fallbackDuration: fallbackDuration(samples, padDurations, bpm),
    });
    setDroppedPitch(midi?.droppedPitch ?? false);
    return midi;
  };

  const pressedAt = useRef<{ x: number; y: number } | null>(null);

  const handleExport = () => {
    const midi = build();
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
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
    pressedAt.current = null;
    const midi = build();
    if (midi) engine.dragMidi?.(fileName, midi.bytes);
  };

  const handlePointerEnd = () => {
    pressedAt.current = null;
  };

  const disabled = !canExport || !loopSettings;

  return (
    <div className={`${styles.export} ${compact ? styles.compact : ""}`}>
      <div className={styles.segment}>
        <button
          className={styles.button}
          onClick={handleExport}
          disabled={disabled}
          aria-label="Export MIDI"
          title={compact ? "Export this pad's loop as MIDI" : "Export this loop as MIDI"}
        >
          <Download size={14} />
          {!compact && "MIDI"}
        </button>
        {engine.dragMidi && (
          <button
            className={`${styles.button} ${styles.handle}`}
            disabled={disabled}
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
      {droppedPitch &&
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
