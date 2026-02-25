import React, { memo, useEffect, useMemo, useRef } from "react";
import SequencerRow from "./SequencerRow";
import type { GridEvent } from "./hooks/useSequencerGrid";
import type { Subdivision } from "./utils/gridConversions";
import { subdivisionToCellsPerBeat } from "./utils/gridConversions";
import { useAudioContext } from "src/app/contexts/AudioContext";

type SequencerGridProps = {
  gridEvents: Map<string, GridEvent[]>;
  totalColumns: number;
  bars: number;
  beats: number;
  subdivision: Subdivision;
  cellWidth: number;
  onCellClick?: (padId: string, columnIndex: number, note?: string) => void;
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
  onResizeStartEnd?: (
    padId: string,
    eventIndex: number,
    newColumnStart: number,
    newColumnWidth: number,
  ) => void;
  playheadPosition?: number;
  snapToGrid?: boolean;
  pianoRollMode?: boolean;
  pianoRollNotes?: string[];
  pianoRollPadId?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  isMinZoom?: boolean;
  isMaxZoom?: boolean;
  onClearRow?: (padId: string) => void;
};

const SequencerGrid: React.FC<SequencerGridProps> = memo(
  ({
    gridEvents,
    totalColumns,
    bars,
    beats,
    subdivision,
    cellWidth,
    onCellClick,
    onDeleteEvent,
    onDragEnd,
    onResizeEnd,
    onResizeStartEnd,
    playheadPosition = 0,
    snapToGrid = true,
    pianoRollMode = false,
    pianoRollNotes = [],
    pianoRollPadId,
    onZoomIn,
    onZoomOut,
    isMinZoom = false,
    isMaxZoom = false,
    onClearRow,
  }) => {
    const { allSampleData, selectedSampleId } = useAudioContext();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Two-finger pinch/zoom on the grid
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          if (e.deltaY < 0 && !isMaxZoom) {
            onZoomIn?.();
          } else if (e.deltaY > 0 && !isMinZoom) {
            onZoomOut?.();
          }
        }
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }, [onZoomIn, onZoomOut, isMinZoom, isMaxZoom]);

    // Generate pad IDs in order (pad-1 through pad-16) for drum mode
    const padIds = useMemo(
      () => Array.from({ length: 16 }, (_, i) => `pad-${i + 1}`),
      [],
    );

    // Build rows: either 16 drum pads or N piano roll note rows
    const rows = useMemo(() => {
      if (pianoRollMode && pianoRollPadId && pianoRollNotes.length > 0) {
        return pianoRollNotes.map((note, idx) => ({
          key: `${pianoRollPadId}-${note}-${idx}`,
          padId: pianoRollPadId,
          padNumber: idx + 1,
          note,
          label: note,
          isSharp: note.includes("#"),
        }));
      }
      return padIds.map((padId) => {
        const padNumber = parseInt(padId.split("-")[1], 10);
        return {
          key: padId,
          padId,
          padNumber,
          note: undefined as string | undefined,
          label: undefined as string | undefined,
          isSharp: false,
        };
      });
    }, [pianoRollMode, pianoRollPadId, pianoRollNotes, padIds]);

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
          <div style={{ width: `${80 + totalColumns * cellWidth + (!pianoRollMode ? 28 : 0)}px` }}>
            {/* Column headers - inside scroll container */}
            <div className="flex bg-gray-200 border-b-2 border-gray-400 sticky top-0 z-30">
              {/* Spacer for pad labels column */}
              <div className="sticky left-0 z-30 w-20 min-w-20 bg-gray-200 border-r-2 border-gray-300 flex items-center justify-center text-xs font-bold">
                {pianoRollMode ? "Note" : "Pad"}
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
              {rows.map((row) => {
                const sampleData = allSampleData[row.padId];
                if (!sampleData) return null;

                const allEvents = gridEvents.get(row.padId) || [];
                // In piano roll mode, filter events to only show those matching this row's note
                const events = pianoRollMode && row.note
                  ? allEvents.filter((e) => e.originalEvent.note === row.note)
                  : allEvents;

                return (
                  <SequencerRow
                    key={row.key}
                    padId={row.padId}
                    padNumber={row.padNumber}
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
                    onResizeStartEnd={onResizeStartEnd}
                    isSelected={!pianoRollMode && row.padId === selectedSampleId}
                    snapToGrid={snapToGrid}
                    rowLabel={row.label}
                    pianoRollMode={pianoRollMode}
                    pianoRollNote={row.note}
                    isSharpRow={row.isSharp}
                    onClearRow={!pianoRollMode ? onClearRow : undefined}
                  />
                );
              })}

              {/* Playhead overlay */}
              {playheadPosition > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                  style={{
                    left: `${80 + playheadPosition * cellWidth}px`,
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
