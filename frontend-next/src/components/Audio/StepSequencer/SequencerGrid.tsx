import React, { memo, useMemo, useRef } from "react";
import SequencerRow from "./SequencerRow";
import type { GridEvent } from "./hooks/useSequencerGrid";
import type { SampleTypeFE } from "src/types/audioTypesFE";
import type { Subdivision } from "./utils/gridConversions";
import { subdivisionToCellsPerBeat } from "./utils/gridConversions";

type SequencerGridProps = {
  allSampleData: Record<string, SampleTypeFE>;
  gridEvents: Map<string, GridEvent[]>;
  totalColumns: number;
  bars: number;
  beats: number;
  subdivision: Subdivision;
  cellWidth: number;
  selectedSampleId: string;
  onCellClick?: (padId: string, columnIndex: number) => void;
  onDeleteEvent?: (padId: string, eventIndex: number) => void;
  onDragEnd?: (
    padId: string,
    eventIndex: number,
    newColumnStart: number,
  ) => void;
  onResizeEnd?: (
    padId: string,
    eventIndex: number,
    newColumnWidth: number,
  ) => void;
  playheadPosition?: number;
};

const SequencerGrid: React.FC<SequencerGridProps> = memo(
  ({
    allSampleData,
    gridEvents,
    totalColumns,
    bars,
    beats,
    subdivision,
    cellWidth,
    selectedSampleId,
    onCellClick,
    onDeleteEvent,
    onDragEnd,
    onResizeEnd,
    playheadPosition = 0,
  }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Generate pad IDs in order (pad-1 through pad-16)
    const padIds = useMemo(
      () => Array.from({ length: 16 }, (_, i) => `pad-${i + 1}`),
      [],
    );

    const cellsPerBeat = subdivisionToCellsPerBeat[subdivision];
    const cellsPerBar = beats * cellsPerBeat;

    // Generate header labels
    const headerLabels = useMemo(() => {
      const labels: { text: string; columnSpan: number; isBar: boolean }[] = [];

      for (let bar = 0; bar < bars; bar++) {
        labels.push({
          text: `${bar + 1}`,
          columnSpan: cellsPerBar,
          isBar: true,
        });
      }

      return labels;
    }, [bars, cellsPerBar]);

    return (
      <div className="flex flex-col border border-gray-300 rounded h-full">
        {/* Scrollable container for both header and grid */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-auto h-full"
        >
          <div style={{ width: `${64 + totalColumns * cellWidth}px` }}>
            {/* Column headers - inside scroll container */}
            <div className="flex bg-gray-200 border-b-2 border-gray-400 sticky top-0 z-30">
              {/* Spacer for pad labels column */}
              <div className="sticky left-0 z-30 w-16 min-w-16 bg-gray-200 border-r-2 border-gray-300 flex items-center justify-center text-xs font-bold">
                Pad
              </div>

              {/* Bar/beat labels */}
              <div className="flex">
                {headerLabels.map((label, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-center text-xs font-semibold border-r border-gray-400 bg-gray-200"
                    style={{ width: `${label.columnSpan * cellWidth}px` }}
                  >
                    Bar {label.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid rows */}
            <div className="relative">
              {padIds.map((padId) => {
                const padNumber = parseInt(padId.split("-")[1], 10);
                const sampleData = allSampleData[padId];
                const events = gridEvents.get(padId) || [];

                if (!sampleData) return null;

                return (
                  <SequencerRow
                    key={padId}
                    padId={padId}
                    padNumber={padNumber}
                    sampleData={sampleData}
                    events={events}
                    totalColumns={totalColumns}
                    cellWidth={cellWidth}
                    beats={beats}
                    subdivision={subdivision}
                    onCellClick={onCellClick}
                    onDeleteEvent={onDeleteEvent}
                    onDragEnd={onDragEnd}
                    onResizeEnd={onResizeEnd}
                    isSelected={padId === selectedSampleId}
                  />
                );
              })}

              {/* Playhead overlay */}
              {playheadPosition > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                  style={{
                    left: `${64 + playheadPosition * cellWidth}px`,
                    transition: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

SequencerGrid.displayName = "SequencerGrid";

export default SequencerGrid;
