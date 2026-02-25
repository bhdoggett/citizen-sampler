import React, { memo } from "react";
import { Copy, ClipboardPaste, X } from "lucide-react";
import { Subdivision, subdivisionLabels } from "./utils/gridConversions";
import type { ScaleName } from "src/lib/audio/util/scaleNotes";

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
      <div className="flex flex-col m-1 gap-1">
        {/* Main controls row: grid/snap, copy/paste, zoom */}
        <div className="flex justify-between items-center gap-2">
          {/* Subdivision selector and snap toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-gray-700">Grid:</label>
            <select
              value={subdivision}
              onChange={(e) =>
                onSubdivisionChange(e.target.value as Subdivision)
              }
              className="border border-gray-700 shadow-inner shadow-slate-800 text-center bg-white text-sm py-0"
            >
              {subdivisionOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {subdivisionLabels[sub]}
                </option>
              ))}
            </select>
            <button
              onClick={onSnapToggle}
              className={`border-1 border-black px-2 text-sm ${
                snapToGrid
                  ? "bg-slate-600 text-white font-bold shadow-inner shadow-black"
                  : "bg-slate-200 text-black shadow-sm shadow-slate-500"
              }`}
              title={snapToGrid ? "Snap to grid: ON" : "Snap to grid: OFF"}
            >
              Snap
            </button>
            <button
              onClick={onPianoRollToggle}
              className={`border-1 border-black px-2 text-sm ${
                pianoRollMode
                  ? "bg-slate-600 text-white font-bold shadow-inner shadow-black"
                  : "bg-slate-200 text-black shadow-sm shadow-slate-500"
              }`}
              title={
                pianoRollMode
                  ? "Switch to Drum mode"
                  : "Switch to Piano Roll mode"
              }
            >
              {"\u266B"}
            </button>
            {pianoRollMode && (
              <>
                <select
                  value={pianoRollScale}
                  onChange={(e) =>
                    onPianoRollScaleChange(e.target.value as ScaleName)
                  }
                  className="border border-gray-700 shadow-inner shadow-slate-800 text-center bg-white text-sm py-0"
                >
                  <option value="chromatic">Chromatic</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="pentatonic">Pentatonic</option>
                </select>
                <span className="text-xs text-gray-600 font-medium">
                  {selectedSampleId}
                </span>
              </>
            )}
          </div>

          {/* Copy/Paste loop controls (hidden in piano roll mode) */}
          {!pianoRollMode && (
            <div className="flex items-center gap-1">
              {hasCopiedPattern ? (
                <>
                  <button
                    onClick={onPasteLoop}
                    title="Paste loop pattern"
                    className="border-1 border-black px-1.5 py-0.5 text-sm flex items-center gap-1 bg-slate-200 text-black shadow-sm shadow-slate-500"
                  >
                    <ClipboardPaste size={16} />
                    <span className="text-xs font-medium">
                      Paste from Loop {copiedFromLoop}
                    </span>
                  </button>
                  <button
                    onClick={onCancelCopy}
                    title="Cancel paste"
                    className="border-1 border-black px-1 py-0.5 text-sm bg-slate-200 text-black shadow-sm shadow-slate-500"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button
                  onClick={onCopyLoop}
                  title="Copy loop pattern"
                  className="border-1 border-black px-1.5 py-0.5 text-sm flex items-center gap-1 bg-slate-200 text-black shadow-sm shadow-slate-500"
                >
                  <Copy size={16} />
                  <span className="text-xs font-medium">Copy loop</span>
                </button>
              )}
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <label className="text-sm font-bold text-gray-700">Zoom:</label>
            <button
              onClick={onZoomOut}
              disabled={isMinZoom}
              className="text-sm px-1 bg-slate-400 hover:bg-slate-500 text-white border border-black shadow-inner shadow-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              -
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
              {zoomPercent}%
            </span>
            <button
              onClick={onZoomIn}
              disabled={isMaxZoom}
              className="text-sm px-1 bg-slate-400 hover:bg-slate-500 text-white border border-black shadow-inner shadow-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
