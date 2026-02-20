"use client";

import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import * as Tone from "tone";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import SequencerGrid from "./SequencerGrid";
import SequencerControls from "./SequencerControls";
import { useSequencerGrid } from "./hooks/useSequencerGrid";
import {
  Subdivision,
  gridPositionToTicks,
  getSubdivisionDuration,
  secondsToGridPosition,
  subdivisionToCellsPerBeat,
} from "./utils/gridConversions";
import type { LoopName } from "../../../../../shared/types/audioTypes";
import type { SampleEventFE } from "src/types/audioTypesFE";

const PAD_LABEL_WIDTH = 64; // Width of the pad label column
const CONTAINER_PADDING = 8; // Approximate padding/borders
const MAX_CELL_WIDTH = 48;
const MIN_CELL_WIDTH = 8;

const StepSequencer: React.FC = () => {
  const {
    allSampleData,
    setAllSampleData,
    currentLoop,
    allLoopSettings,
    selectedSampleId,
    setSelectedSampleId,
    loopIsPlaying,
  } = useAudioContext();
  const { hotKeysActive } = useUIContext();

  const [subdivision, setSubdivision] = useState<Subdivision>("8n");
  const [cellWidth, setCellWidth] = useState<number | null>(null); // null until initialized
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  const loopSettings = allLoopSettings[currentLoop as LoopName];

  const { totalColumns, gridEvents, bars, beats } = useSequencerGrid({
    loopSettings,
    subdivision,
    allSampleData,
    currentLoop,
  });

  // Calculate minimum cell width to fit the grid in the container
  const minCellWidth = useMemo(() => {
    if (containerWidth === 0 || totalColumns === 0) return MIN_CELL_WIDTH;
    const availableWidth = containerWidth - PAD_LABEL_WIDTH - CONTAINER_PADDING;
    return Math.max(MIN_CELL_WIDTH, Math.floor(availableWidth / totalColumns));
  }, [containerWidth, totalColumns]);

  // Measure container width on mount and resize
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener("resize", updateContainerWidth);
    return () => window.removeEventListener("resize", updateContainerWidth);
  }, []);

  // Store the initial totalColumns to calculate initial cell width
  const initialColumnsRef = useRef<number | null>(null);
  if (initialColumnsRef.current === null && totalColumns > 0) {
    initialColumnsRef.current = totalColumns;
  }

  // Initialize cell width to fill available space on first render (synchronous to prevent flash)
  useLayoutEffect(() => {
    if (hasInitializedRef.current || containerWidth === 0 || initialColumnsRef.current === null) return;

    const availableWidth = containerWidth - PAD_LABEL_WIDTH - CONTAINER_PADDING;
    const optimalCellWidth = Math.floor(availableWidth / initialColumnsRef.current);
    const clampedCellWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, optimalCellWidth));

    setCellWidth(clampedCellWidth);
    hasInitializedRef.current = true;
  }, [containerWidth]);

  // Playhead animation
  useEffect(() => {
    if (!loopIsPlaying || !loopSettings) {
      setPlayheadPosition(0);
      return;
    }

    const updatePlayhead = () => {
      const transport = Tone.getTransport();
      const loopEndSeconds = Tone.Time(transport.loopEnd).toSeconds();
      const currentSeconds = transport.seconds % loopEndSeconds;
      const position = secondsToGridPosition(
        currentSeconds,
        loopSettings,
        subdivision
      );
      setPlayheadPosition(position);
      rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    rafRef.current = requestAnimationFrame(updatePlayhead);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [loopIsPlaying, loopSettings, subdivision]);

  // Handle cell click to create new event
  const handleCellClick = useCallback(
    (padId: string, columnIndex: number) => {
      if (!loopSettings) return;

      const startTimeTicks = gridPositionToTicks(
        columnIndex,
        loopSettings,
        subdivision
      );
      const duration = getSubdivisionDuration(loopSettings, subdivision);
      const baseNote = allSampleData[padId]?.settings.baseNote || "C4";

      const newEvent: SampleEventFE = {
        startTime: startTimeTicks,
        duration,
        note: baseNote,
        velocity: 1,
      };

      setAllSampleData((prev) => ({
        ...prev,
        [padId]: {
          ...prev[padId],
          events: {
            ...prev[padId].events,
            [currentLoop]: [...(prev[padId].events[currentLoop] || []), newEvent],
          },
        },
      }));

      setSelectedSampleId(padId);
    },
    [
      allSampleData,
      currentLoop,
      loopSettings,
      setAllSampleData,
      setSelectedSampleId,
      subdivision,
    ]
  );

  // Handle event deletion
  const handleDeleteEvent = useCallback(
    (padId: string, eventIndex: number) => {
      setAllSampleData((prev) => ({
        ...prev,
        [padId]: {
          ...prev[padId],
          events: {
            ...prev[padId].events,
            [currentLoop]: prev[padId].events[currentLoop].filter(
              (_, idx) => idx !== eventIndex
            ),
          },
        },
      }));
    },
    [currentLoop, setAllSampleData]
  );

  // Handle event drag (move)
  const handleDragEnd = useCallback(
    (padId: string, eventIndex: number, newColumnStart: number) => {
      if (!loopSettings) return;

      const newStartTimeTicks = gridPositionToTicks(
        newColumnStart,
        loopSettings,
        subdivision
      );

      setAllSampleData((prev) => ({
        ...prev,
        [padId]: {
          ...prev[padId],
          events: {
            ...prev[padId].events,
            [currentLoop]: prev[padId].events[currentLoop].map((event, idx) =>
              idx === eventIndex
                ? { ...event, startTime: newStartTimeTicks }
                : event
            ),
          },
        },
      }));
    },
    [currentLoop, loopSettings, setAllSampleData, subdivision]
  );

  // Handle event resize
  const handleResizeEnd = useCallback(
    (padId: string, eventIndex: number, newColumnWidth: number) => {
      if (!loopSettings) return;

      const newDuration =
        getSubdivisionDuration(loopSettings, subdivision) * newColumnWidth;

      setAllSampleData((prev) => ({
        ...prev,
        [padId]: {
          ...prev[padId],
          events: {
            ...prev[padId].events,
            [currentLoop]: prev[padId].events[currentLoop].map((event, idx) =>
              idx === eventIndex ? { ...event, duration: newDuration } : event
            ),
          },
        },
      }));
    },
    [currentLoop, loopSettings, setAllSampleData, subdivision]
  );

  // Handle subdivision change — scale cellWidth so bar width stays constant
  const handleSubdivisionChange = useCallback((newSubdivision: Subdivision) => {
    const oldCellsPerBeat = subdivisionToCellsPerBeat[subdivision];
    const newCellsPerBeat = subdivisionToCellsPerBeat[newSubdivision];
    const ratio = oldCellsPerBeat / newCellsPerBeat;

    setCellWidth((prev) => {
      const current = prev ?? minCellWidth;
      const newWidth = current * ratio;
      return Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, newWidth));
    });

    setSubdivision(newSubdivision);
  }, [subdivision, minCellWidth]);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setCellWidth((prev) => Math.min((prev ?? minCellWidth) + 4, MAX_CELL_WIDTH));
  }, [minCellWidth]);

  const handleZoomOut = useCallback(() => {
    setCellWidth((prev) => Math.max((prev ?? minCellWidth) - 4, minCellWidth));
  }, [minCellWidth]);

  // Clear all events on selected pad for current loop
  const handleClearSelectedPad = useCallback(() => {
    if (!selectedSampleId) return;
    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: {
        ...prev[selectedSampleId],
        events: {
          ...prev[selectedSampleId].events,
          [currentLoop]: [],
        },
      },
    }));
  }, [currentLoop, selectedSampleId, setAllSampleData]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!hotKeysActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace: Clear events on selected pad
      if (e.key === "Delete" || e.key === "Backspace") {
        // Only handle if not in an input field
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        handleClearSelectedPad();
      }

      // Plus/Equals: Zoom in
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleZoomIn();
      }

      // Minus: Zoom out
      if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    hotKeysActive,
    handleClearSelectedPad,
    handleZoomIn,
    handleZoomOut,
  ]);

  if (!loopSettings) {
    return (
      <div className="p-4 text-center text-gray-500">
        No loop settings available
      </div>
    );
  }

  // Use effective cell width - fallback to minCellWidth while initializing
  const effectiveCellWidth = cellWidth ?? minCellWidth;

  return (
    <div ref={containerRef} className="flex flex-col w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="bg-slate-800 px-4 py-1 border-2 border-slate-800 text-white font-bold">
          Step Sequencer
        </h3>
        <SequencerControls
          subdivision={subdivision}
          onSubdivisionChange={handleSubdivisionChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          cellWidth={effectiveCellWidth}
          minCellWidth={minCellWidth}
        />
      </div>

      <SequencerGrid
        allSampleData={allSampleData}
        gridEvents={gridEvents}
        totalColumns={totalColumns}
        bars={bars}
        beats={beats}
        subdivision={subdivision}
        cellWidth={effectiveCellWidth}
        selectedSampleId={selectedSampleId}
        onCellClick={handleCellClick}
        onDeleteEvent={handleDeleteEvent}
        onDragEnd={handleDragEnd}
        onResizeEnd={handleResizeEnd}
        playheadPosition={loopIsPlaying ? playheadPosition : 0}
      />
    </div>
  );
};

export default StepSequencer;
