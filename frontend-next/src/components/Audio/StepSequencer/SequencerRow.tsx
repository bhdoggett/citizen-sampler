import React, { memo, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import SequencerEvent from "./SequencerEvent";
import SequencerPadButton from "./SequencerPadButton";
import type { GridEvent } from "./hooks/useSequencerGrid";
import type { SampleTypeFE } from "src/types/audioTypesFE";
import styles from "./SequencerRow.module.css";

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
  onVelocityChange?: (
    padId: string,
    eventIndex: number,
    velocity: number
  ) => void;
  ctrlHeld?: boolean;
  isSelected?: boolean;
  snapToGrid?: boolean;
  rowLabel?: string;
  pianoRollMode?: boolean;
  pianoRollTriggerNote?: string;
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
    onVelocityChange,
    ctrlHeld = false,
    isSelected = false,
    snapToGrid = true,
    rowLabel,
    pianoRollMode = false,
    pianoRollTriggerNote,
    isSharpRow = false,
    onClearRow,
  }) => {
    const [velocityPaintActive, setVelocityPaintActive] = useState(false);

    // Stop velocity painting when mouse/touch is released anywhere
    useEffect(() => {
      if (!velocityPaintActive) return;

      const handleUp = () => setVelocityPaintActive(false);

      document.addEventListener("mouseup", handleUp);
      document.addEventListener("touchend", handleUp);

      return () => {
        document.removeEventListener("mouseup", handleUp);
        document.removeEventListener("touchend", handleUp);
      };
    }, [velocityPaintActive]);

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
        // Pass the pre-resolved trigger note so StepSequencer stores it directly
        onCellClick(padId, columnIndex, pianoRollTriggerNote);
      }
    };

    // Row state class based on mute/solo/sharp/selection
    const getRowStateClass = () => {
      if (pianoRollMode) return isSharpRow ? styles.sharp : "";
      if (sampleData.settings.mute) return styles.muted;
      if (sampleData.settings.solo) return styles.soloed;
      return isSelected ? styles.selected : "";
    };

    return (
      <div
        className={`${styles.row} ${getRowStateClass()}`}
      >
        {/* Pad label - sticky left */}
        <div className={styles.label}>
          <span className={styles.labelText} title={rowLabel || sampleData.title}>
            {rowLabel || padNumber}
          </span>
          <SequencerPadButton padId={padId} padNumber={padNumber} overrideNote={pianoRollTriggerNote} />
        </div>

        {/* Grid cells */}
        <div
          className={styles.cells}
          style={{ width: `${totalColumns * cellWidth}px` }}
        >
          {/* Background grid cells */}
          <div className={styles.cellLayer}>
            {Array.from({ length: totalColumns }, (_, i) => {
              // Border-r is on the RIGHT edge, so mark last cell of each bar/beat
              const isBarEnd = (i + 1) % cellsPerBar === 0;
              const isBeatEnd = (i + 1) % cellsPerBeat === 0 && !isBarEnd;

              return (
                <div
                  key={i}
                  className={`${styles.cell} ${isBarEnd ? styles.barEnd : isBeatEnd ? styles.beatEnd : ""}`}
                  style={{ width: `${cellWidth}px` }}
                  onClick={() => handleCellClick(i)}
                />
              );
            })}
          </div>

          {/* Events layer - pointer-events-none allows clicks to pass through to cells */}
          <div className={styles.eventLayer}>
            {events.map((gridEvent, idx) => (
              <SequencerEvent
                key={`${gridEvent.padId}-${gridEvent.eventIndex}-${idx}`}
                gridEvent={gridEvent}
                cellWidth={cellWidth}
                onDelete={onDeleteEvent}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
                onResizeStartEnd={onResizeStartEnd}
                onVelocityChange={onVelocityChange}
                velocityPaintActive={velocityPaintActive}
                onVelocityPaintStart={() => setVelocityPaintActive(true)}
                ctrlHeld={ctrlHeld}
                isSelected={isSelected}
                snapToGrid={snapToGrid}
              />
            ))}
          </div>
        </div>

        {/* Clear row trash icon - drum mode only */}
        {!pianoRollMode && onClearRow && (
          <button
            className={styles.clear}
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
