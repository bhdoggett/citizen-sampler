import React, { memo } from "react";
import SequencerEvent from "./SequencerEvent";
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
  onCellClick?: (padId: string, columnIndex: number) => void;
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
  isSelected?: boolean;
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
    isSelected = false,
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
        onCellClick(padId, columnIndex);
      }
    };

    // Get row background color based on mute/solo
    const getRowBgClass = () => {
      if (sampleData.settings.mute) return "bg-red-50";
      if (sampleData.settings.solo) return "bg-yellow-50";
      return isSelected ? "bg-blue-50" : "bg-white";
    };

    return (
      <div
        className={`flex items-stretch border-b border-gray-200 ${getRowBgClass()}`}
      >
        {/* Pad label - sticky left */}
        <div
          className={`sticky left-0 z-20 w-16 min-w-16 flex items-center justify-center
            border-r-2 border-gray-300 font-medium text-sm
            ${sampleData.settings.mute ? "bg-red-200 text-red-800" : ""}
            ${sampleData.settings.solo ? "bg-yellow-200 text-yellow-800" : ""}
            ${!sampleData.settings.mute && !sampleData.settings.solo ? (isSelected ? "bg-blue-100" : "bg-gray-100") : ""}`}
        >
          <span className="truncate px-1" title={sampleData.title}>
            {padNumber}
          </span>
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
                  className={`h-full border-r cursor-pointer hover:bg-gray-100
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
                isSelected={isSelected}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

SequencerRow.displayName = "SequencerRow";

export default SequencerRow;
