import { useMemo } from "react";
import type { LoopSettingsFE, SampleEventFE } from "src/types/audioTypesFE";
import {
  Subdivision,
  getTotalColumns,
  getCellDurationSeconds,
  ticksToGridPosition,
  durationToGridWidth,
  quantizeGridPosition,
} from "../utils/gridConversions";

export type GridEvent = {
  originalEvent: SampleEventFE;
  columnStart: number;
  columnWidth: number;
  padId: string;
  eventIndex: number;
  quantizedColumnStart?: number;
};

type UseSequencerGridProps = {
  loopSettings: LoopSettingsFE | null;
  subdivision: Subdivision;
  allSampleData: Record<string, { events: Record<string, SampleEventFE[]>; settings?: { quantize: boolean; quantVal: string } }>;
  currentLoop: string;
};

type UseSequencerGridReturn = {
  totalColumns: number;
  cellDuration: number;
  gridEvents: Map<string, GridEvent[]>;
  bars: number;
  beats: number;
};

export function useSequencerGrid({
  loopSettings,
  subdivision,
  allSampleData,
  currentLoop,
}: UseSequencerGridProps): UseSequencerGridReturn {
  const totalColumns = useMemo(() => {
    if (!loopSettings) return 0;
    return getTotalColumns(loopSettings, subdivision);
  }, [loopSettings, subdivision]);

  const cellDuration = useMemo(() => {
    if (!loopSettings) return 0;
    return getCellDurationSeconds(loopSettings, subdivision);
  }, [loopSettings, subdivision]);

  // Map pad IDs to their events with grid positions
  const gridEvents = useMemo(() => {
    const eventMap = new Map<string, GridEvent[]>();

    if (!loopSettings) return eventMap;

    Object.entries(allSampleData).forEach(([padId, sampleData]) => {
      const events = sampleData.events[currentLoop] || [];
      const mappedEvents: GridEvent[] = [];

      events.forEach((event, eventIndex) => {
        if (event.startTime === null) return;

        const columnStart = ticksToGridPosition(
          event.startTime,
          loopSettings,
          subdivision,
        );
        const columnWidth = durationToGridWidth(
          event.duration,
          loopSettings,
          subdivision,
        );

        // Compute quantized column start if sample has quantize enabled
        const quantizedColumnStart =
          sampleData.settings?.quantize && sampleData.settings.quantVal
            ? quantizeGridPosition(
                columnStart,
                loopSettings,
                subdivision,
                sampleData.settings.quantVal,
                totalColumns,
              )
            : undefined;

        // Only include events that are within the grid bounds
        if (columnStart < totalColumns) {
          mappedEvents.push({
            originalEvent: event,
            columnStart,
            columnWidth: Math.min(columnWidth, totalColumns - columnStart),
            padId,
            eventIndex,
            quantizedColumnStart,
          });
        }
      });

      eventMap.set(padId, mappedEvents);
    });

    return eventMap;
  }, [allSampleData, currentLoop, loopSettings, subdivision, totalColumns]);

  return {
    totalColumns,
    cellDuration,
    gridEvents,
    bars: loopSettings?.bars ?? 0,
    beats: loopSettings?.beats ?? 0,
  };
}
