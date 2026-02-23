import React, { memo } from "react";
import { Trash2 } from "lucide-react";
import SequencerEvent from "./SequencerEvent";
import SequencerPadButton from "./SequencerPadButton";
import type { GridEvent } from "./hooks/useSequencerGrid";
import type { SampleTypeFE } from "src/types/audioTypesFE";

type SequencerRowProps = {
  padId: string;
  padNumber: number;
  sampleData: SampleTypeFE;
  events: GridEvent[];
  totalColumns: number;
  cellWidth: number;
  beats: number;
  subdivision: string;
  onCellClick?: (padId: string, columnIndex: number, note?: string) => void;
  onDeleteEvent?: (padId: string, eventIndex: number) => void;
  onDragEnd?: (
    padId: string,
    eventIndex: number,
    newColumnStart: number
  ) => void;
  onResizeEnd?: (
    padId: string,
    eventIndex: number,
    newColumnWidth: number
  ) => void;
  onResizeStartEnd?: (
    padId: string,
    eventIndex: number,
    newColumnStart: number,
    newColumnWidth: number
  ) => void;
  isSelected?: boolean;
  snapToGrid?: boolean;
  rowLabel?: string;
  pianoRollMode?: boolean;
  pianoRollNote?: string;
  isSharpRow?: boolean;
  onClearRow?: (padId: string) => void;
};

const SequencerRow: React.FC<SequencerRowProps> = memo(
  ({
    padId,
    padNumber,
    sampleData,
    events,
    totalColumns,
    cellWidth,
    beats,
    subdivision,
    onCellClick,
    onDeleteEvent,
    onDragEnd,
    onResizeEnd,
    onResizeStartEnd,
    isSelected = false,
    snapToGrid = true,
    rowLabel,
    pianoRollMode = false,
    pianoRollNote,
    isSharpRow = false,
    onClearRow,
  }) => {
    // Calculate cells per beat based on subdivision
    const getCellsPerBeat = () => {
      switch (subdivision) {
        case "1n":
          return 0.25;
        case "2n":
          return 0.5;
        case "4n":
          return 1;
        case "8n":
          return 2;
        case "16n":
          return 4;
        default:
          return 1;
      }
    };

    const cellsPerBeat = getCellsPerBeat();
    const cellsPerBar = beats * cellsPerBeat;

    const handleCellClick = (columnIndex: number) => {
      if (onCellClick) {
        onCellClick(padId, columnIndex, pianoRollNote);
      }
    };

    // Get row background color based on mute/solo/sharp
    const getRowBgClass = () => {
      if (!pianoRollMode) {
        if (sampleData.settings.mute) return "bg-red-50";
        if (sampleData.settings.solo) return "bg-yellow-50";
        return isSelected ? "bg-blue-50" : "bg-white";
      }
      return isSharpRow ? "bg-gray-200" : "bg-white";
    };

    return (
      <div
        className={`flex items-stretch border-b border-gray-200 ${getRowBgClass()}`}
      >
        {/* Pad label - sticky left */}
        <div
          className={`sticky left-0 z-20 w-20 min-w-20 flex items-center justify-between px-1.5
            border-r-2 border-gray-300 font-medium text-sm
            ${pianoRollMode
              ? (isSharpRow ? "bg-gray-300" : "bg-gray-100")
              : `${sampleData.settings.mute ? "bg-red-200 text-red-800" : ""}
                 ${sampleData.settings.solo ? "bg-yellow-200 text-yellow-800" : ""}
                 ${!sampleData.settings.mute && !sampleData.settings.solo ? (isSelected ? "bg-blue-100" : "bg-gray-100") : ""}`
            }`}
        >
          <span className="truncate" title={rowLabel || sampleData.title}>
            {rowLabel || padNumber}
          </span>
          <SequencerPadButton padId={padId} padNumber={padNumber} overrideNote={pianoRollNote} />
        </div>

        {/* Grid cells */}
        <div
          className="relative flex-1 h-8"
          style={{ width: `${totalColumns * cellWidth}px` }}
        >
          {/* Background grid cells */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalColumns }, (_, i) => {
              // Border-r is on the RIGHT edge, so mark last cell of each bar/beat
              const isBarEnd = (i + 1) % cellsPerBar === 0;
              const isBeatEnd = (i + 1) % cellsPerBeat === 0 && !isBarEnd;

              return (
                <div
                  key={i}
                  className={`h-full border-r cursor-pointer
                    ${isSharpRow ? "hover:bg-gray-300" : "hover:bg-gray-100"}
                    ${isBarEnd ? "border-gray-400" : isBeatEnd ? "border-gray-300" : "border-gray-200"}`}
                  style={{ width: `${cellWidth}px` }}
                  onClick={() => handleCellClick(i)}
                />
              );
            })}
          </div>

          {/* Events layer - pointer-events-none allows clicks to pass through to cells */}
          <div className="absolute inset-0 pointer-events-none">
            {events.map((gridEvent, idx) => (
              <SequencerEvent
                key={`${gridEvent.padId}-${gridEvent.eventIndex}-${idx}`}
                gridEvent={gridEvent}
                cellWidth={cellWidth}
                onDelete={onDeleteEvent}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
                onResizeStartEnd={onResizeStartEnd}
                isSelected={isSelected}
                snapToGrid={snapToGrid}
              />
            ))}
          </div>
        </div>

        {/* Clear row trash icon - drum mode only */}
        {!pianoRollMode && onClearRow && (
          <button
            className="sticky right-0 z-20 w-7 min-w-7 flex items-center justify-center bg-gray-100 border-l border-gray-300 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors"
            onClick={() => onClearRow(padId)}
            title="Clear row"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  }
);

SequencerRow.displayName = "SequencerRow";

export default SequencerRow;
