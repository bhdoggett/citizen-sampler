import React, { memo } from "react";
import { Copy, ClipboardPaste, X } from "lucide-react";
import { Subdivision, subdivisionLabels } from "./utils/gridConversions";
import type { ScaleName } from "src/lib/audio/util/scaleNotes";
import styles from "./SequencerControls.module.css";

type SequencerControlsProps = {
  subdivision: Subdivision;
  onSubdivisionChange: (subdivision: Subdivision) => void;
  snapToGrid: boolean;
  onSnapToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomPercent: number;
  isMinZoom: boolean;
  isMaxZoom: boolean;
  pianoRollMode: boolean;
  onPianoRollToggle: () => void;
  pianoRollScale: ScaleName;
  onPianoRollScaleChange: (scale: ScaleName) => void;
  selectedSampleId: string;
  onCopyLoop?: () => void;
  onPasteLoop?: () => void;
  hasCopiedPattern?: boolean;
  copiedFromLoop?: string | null;
  onCancelCopy?: () => void;
};

const subdivisionOptions: Subdivision[] = ["4n", "8n", "16n", "32n"];

const SequencerControls: React.FC<SequencerControlsProps> = memo(
  ({
    subdivision,
    onSubdivisionChange,
    snapToGrid,
    onSnapToggle,
    onZoomIn,
    onZoomOut,
    zoomPercent,
    isMinZoom,
    isMaxZoom,
    pianoRollMode,
    onPianoRollToggle,
    pianoRollScale,
    onPianoRollScaleChange,
    selectedSampleId,
    onCopyLoop,
    onPasteLoop,
    hasCopiedPattern,
    copiedFromLoop,
    onCancelCopy,
  }) => {
    return (
      <div className={styles.controls}>
        {/* Subdivision selector, snap and piano roll toggles */}
        <div className={styles.group}>
          <label className={styles.label} htmlFor="sequencer-grid">
            Grid
          </label>
          <div className={styles.segment}>
            <select
              id="sequencer-grid"
              value={subdivision}
              onChange={(e) =>
                onSubdivisionChange(e.target.value as Subdivision)
              }
              className={styles.select}
            >
              {subdivisionOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {subdivisionLabels[sub]}
                </option>
              ))}
            </select>
            <button
              onClick={onSnapToggle}
              className={`${styles.button} ${snapToGrid ? styles.buttonOn : ""}`}
              title={snapToGrid ? "Snap to grid: ON" : "Snap to grid: OFF"}
            >
              SNAP
            </button>
            <button
              onClick={onPianoRollToggle}
              className={`${styles.button} ${styles.square} ${pianoRollMode ? styles.buttonOn : ""}`}
              title={
                pianoRollMode
                  ? "Switch to Drum mode"
                  : "Switch to Piano Roll mode"
              }
            >
              {"\u266B"}
            </button>
          </div>
          {pianoRollMode && (
            <>
              <select
                value={pianoRollScale}
                onChange={(e) =>
                  onPianoRollScaleChange(e.target.value as ScaleName)
                }
                className={styles.select}
              >
                <option value="chromatic">Chromatic</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="pentatonic">Pentatonic</option>
              </select>
              <span className={styles.sampleId}>{selectedSampleId}</span>
            </>
          )}
        </div>

        {/* Copy/Paste loop controls (hidden in piano roll mode) */}
        {!pianoRollMode && (
          <div className={styles.segment}>
            {hasCopiedPattern ? (
              <>
                <button
                  onClick={onPasteLoop}
                  title="Paste loop pattern"
                  className={styles.button}
                >
                  <ClipboardPaste size={14} />
                  Paste from {copiedFromLoop}
                </button>
                <button
                  onClick={onCancelCopy}
                  title="Cancel paste"
                  className={`${styles.button} ${styles.square}`}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={onCopyLoop}
                title="Copy loop pattern"
                className={styles.button}
              >
                <Copy size={14} />
                Copy loop
              </button>
            )}
          </div>
        )}

        {/* Zoom controls */}
        <div className={styles.group}>
          <span className={styles.label}>Zoom</span>
          <div className={styles.segment}>
            <button
              onClick={onZoomOut}
              disabled={isMinZoom}
              className={`${styles.button} ${styles.square}`}
              title="Zoom out"
            >
              −
            </button>
            <span className={`${styles.button} ${styles.zoomValue}`}>
              {zoomPercent}%
            </span>
            <button
              onClick={onZoomIn}
              disabled={isMaxZoom}
              className={`${styles.button} ${styles.square}`}
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  },
);

SequencerControls.displayName = "SequencerControls";

export default SequencerControls;
