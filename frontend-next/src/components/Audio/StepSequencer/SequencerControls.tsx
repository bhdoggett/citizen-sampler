import React, { memo } from "react";
import { Subdivision, subdivisionLabels } from "./utils/gridConversions";

type SequencerControlsProps = {
  subdivision: Subdivision;
  onSubdivisionChange: (subdivision: Subdivision) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  cellWidth: number;
  minCellWidth: number;
};

const subdivisionOptions: Subdivision[] = ["4n", "8n", "16n", "32n"];

const SequencerControls: React.FC<SequencerControlsProps> = memo(
  ({
    subdivision,
    onSubdivisionChange,
    onZoomIn,
    onZoomOut,
    cellWidth,
    minCellWidth,
  }) => {
    return (
      <div className="flex items-center gap-4">
        {/* Subdivision selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Grid:</label>
          <select
            value={subdivision}
            onChange={(e) =>
              onSubdivisionChange(e.target.value as Subdivision)
            }
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
          <label className="text-sm font-medium text-gray-700">Zoom:</label>
          <button
            onClick={onZoomOut}
            disabled={cellWidth <= minCellWidth}
            className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            -
          </button>
          <button
            onClick={onZoomIn}
            disabled={cellWidth >= 48}
            className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    );
  }
);

SequencerControls.displayName = "SequencerControls";

export default SequencerControls;
