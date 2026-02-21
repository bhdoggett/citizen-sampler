import React, { memo } from "react";
import { Subdivision, subdivisionLabels } from "./utils/gridConversions";

type SequencerControlsProps = {
  subdivision: Subdivision;
  onSubdivisionChange: (subdivision: Subdivision) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomPercent: number;
  isMinZoom: boolean;
  isMaxZoom: boolean;
};

const subdivisionOptions: Subdivision[] = ["4n", "8n", "16n", "32n"];

const SequencerControls: React.FC<SequencerControlsProps> = memo(
  ({
    subdivision,
    onSubdivisionChange,
    onZoomIn,
    onZoomOut,
    zoomPercent,
    isMinZoom,
    isMaxZoom,
  }) => {
    return (
      <div className="flex justify-between items-center m-1">
        {/* Subdivision selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-700">Grid:</label>
          <select
            value={subdivision}
            onChange={(e) => onSubdivisionChange(e.target.value as Subdivision)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          >
            {subdivisionOptions.map((sub) => (
              <option key={sub} value={sub}>
                {subdivisionLabels[sub]}
              </option>
            ))}
          </select>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <label className="text-sm font-bold text-gray-700">Zoom:</label>
          <button
            onClick={onZoomOut}
            disabled={isMinZoom}
            className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    );
  },
);

SequencerControls.displayName = "SequencerControls";

export default SequencerControls;
