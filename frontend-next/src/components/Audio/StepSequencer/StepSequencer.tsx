"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
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
} from "./utils/gridConversions";
import type { LoopName } from "../../../../../shared/types/audioTypes";
import type { SampleEventFE } from "src/types/audioTypesFE";

const PAD_LABEL_WIDTH = 80; // Width of the pad label column
const CONTAINER_PADDING = 2; // 1px border on each side of the grid
const MAX_CELL_WIDTH = 48;

type StepSequencerProps = {
  maxHeight?: number;
};

const StepSequencer: React.FC<StepSequencerProps> = ({ maxHeight }) => {
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
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loopSettings = allLoopSettings[currentLoop as LoopName];

  const { totalColumns, gridEvents, bars, beats } = useSequencerGrid({
    loopSettings,
    subdivision,
    allSampleData,
    currentLoop,
  });

  // fitCellWidth: the cell width at which the grid exactly fills the container (100% zoom)
  const fitCellWidth = useMemo(() => {
    if (containerWidth === 0 || totalColumns === 0) return 0;
    const availableWidth = containerWidth - PAD_LABEL_WIDTH - CONTAINER_PADDING;
    return availableWidth / totalColumns;
  }, [containerWidth, totalColumns]);

  // Max zoom: cells should never exceed MAX_CELL_WIDTH
  const maxZoom = useMemo(() => {
    if (fitCellWidth <= 0) return 1.0;
    return Math.max(1.0, MAX_CELL_WIDTH / fitCellWidth);
  }, [fitCellWidth]);

  // Derive effective cell width from zoom level
  const effectiveCellWidth = fitCellWidth > 0 ? fitCellWidth * zoomLevel : 0;


  // Zoom percentage for display
  const zoomPercent = Math.round(zoomLevel * 100);
  const isMinZoom = zoomLevel <= 1.0;
  const isMaxZoom = zoomLevel >= maxZoom;

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
        subdivision,
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
        subdivision,
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
            [currentLoop]: [
              ...(prev[padId].events[currentLoop] || []),
              newEvent,
            ],
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
    ],
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
              (_, idx) => idx !== eventIndex,
            ),
          },
        },
      }));
    },
    [currentLoop, setAllSampleData],
  );

  // Handle event drag (move)
  const handleDragEnd = useCallback(
    (padId: string, eventIndex: number, newColumnStart: number) => {
      if (!loopSettings) return;

      const newStartTimeTicks = gridPositionToTicks(
        newColumnStart,
        loopSettings,
        subdivision,
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
                : event,
            ),
          },
        },
      }));
    },
    [currentLoop, loopSettings, setAllSampleData, subdivision],
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
              idx === eventIndex ? { ...event, duration: newDuration } : event,
            ),
          },
        },
      }));
    },
    [currentLoop, loopSettings, setAllSampleData, subdivision],
  );

  // Handle left-edge resize (changes both start time and duration)
  const handleResizeStartEnd = useCallback(
    (padId: string, eventIndex: number, newColumnStart: number, newColumnWidth: number) => {
      if (!loopSettings) return;

      const newStartTimeTicks = gridPositionToTicks(newColumnStart, loopSettings, subdivision);
      const newDuration = getSubdivisionDuration(loopSettings, subdivision) * newColumnWidth;

      setAllSampleData((prev) => ({
        ...prev,
        [padId]: {
          ...prev[padId],
          events: {
            ...prev[padId].events,
            [currentLoop]: prev[padId].events[currentLoop].map((event, idx) =>
              idx === eventIndex
                ? { ...event, startTime: newStartTimeTicks, duration: newDuration }
                : event,
            ),
          },
        },
      }));
    },
    [currentLoop, loopSettings, setAllSampleData, subdivision],
  );

  // Handle subdivision change — zoom level stays the same, fitCellWidth auto-adjusts
  const handleSubdivisionChange = useCallback((newSubdivision: Subdivision) => {
    setSubdivision(newSubdivision);
  }, []);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, maxZoom));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 1.0));
  }, []);

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
  }, [hotKeysActive, handleClearSelectedPad, handleZoomIn, handleZoomOut]);

  if (!loopSettings) {
    return (
      <div className="p-4 text-center text-gray-500">
        No loop settings available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full"
      style={maxHeight ? { height: maxHeight } : undefined}
    >
      <SequencerControls
        subdivision={subdivision}
        onSubdivisionChange={handleSubdivisionChange}
        snapToGrid={snapToGrid}
        onSnapToggle={() => setSnapToGrid((prev) => !prev)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        zoomPercent={zoomPercent}
        isMinZoom={isMinZoom}
        isMaxZoom={isMaxZoom}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
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
          onResizeStartEnd={handleResizeStartEnd}
          playheadPosition={loopIsPlaying ? playheadPosition : 0}
          snapToGrid={snapToGrid}
        />
      </div>
    </div>
  );
};

export default StepSequencer;
