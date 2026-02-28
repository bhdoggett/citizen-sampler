import * as Tone from "tone";
import type { LoopSettingsFE } from "src/types/audioTypesFE";
import type { Ticks } from "tone/build/esm/core/type/Units";

export type Subdivision = "4n" | "8n" | "16n" | "32n";

// Map subdivision to cells per beat
export const subdivisionToCellsPerBeat: Record<Subdivision, number> = {
  "4n": 1, // Quarter note: 1 cell per beat
  "8n": 2, // Eighth note: 2 cells per beat
  "16n": 4, // Sixteenth note: 4 cells per beat
  "32n": 8, // 32nd note: 8 cells per beat
};

export const subdivisionLabels: Record<Subdivision, string> = {
  "4n": "Quarter",
  "8n": "Eighth",
  "16n": "16th",
  "32n": "32nd",
};

/**
 * Calculate total columns in the grid based on loop settings and subdivision
 */
export function getTotalColumns(
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  const { bars, beats } = loopSettings;
  const cellsPerBeat = subdivisionToCellsPerBeat[subdivision];
  return Math.floor(bars * beats * cellsPerBeat);
}

/**
 * Get the duration of one grid cell in seconds
 */
export function getCellDurationSeconds(
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  const { bpm } = loopSettings;
  const secondsPerBeat = 60 / bpm;
  const cellsPerBeat = subdivisionToCellsPerBeat[subdivision];
  return secondsPerBeat / cellsPerBeat;
}

/**
 * Convert Ticks (stored startTime) to grid column index
 * Uses loopSettings.bpm directly to avoid transport BPM sync issues
 */
export function ticksToGridPosition(
  startTime: Ticks,
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  // Convert ticks to seconds using the loop's BPM (not transport BPM)
  const { bpm } = loopSettings;
  const ppq = Tone.getTransport().PPQ; // Pulses per quarter note
  const secondsPerTick = 60 / (bpm * ppq);
  const seconds = (startTime as number) * secondsPerTick;

  const cellDuration = getCellDurationSeconds(loopSettings, subdivision);
  const totalColumns = getTotalColumns(loopSettings, subdivision);

  const column = seconds / cellDuration;
  return Math.min(column, totalColumns - 1);
}

/**
 * Convert grid column index to Ticks
 * Uses loopSettings.bpm directly to avoid transport BPM sync issues
 */
export function gridPositionToTicks(
  columnIndex: number,
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): Ticks {
  const { bpm } = loopSettings;
  const cellDuration = getCellDurationSeconds(loopSettings, subdivision);
  const seconds = columnIndex * cellDuration;

  // Convert seconds to ticks using the loop's BPM
  const ppq = Tone.getTransport().PPQ;
  const ticksPerSecond = (bpm * ppq) / 60;
  return Math.round(seconds * ticksPerSecond) as Ticks;
}

/**
 * Get the duration of one subdivision in seconds
 */
export function getSubdivisionDuration(
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  return getCellDurationSeconds(loopSettings, subdivision);
}

/**
 * Convert event duration to grid width (number of columns)
 */
export function durationToGridWidth(
  duration: number | null,
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  if (duration === null || duration === 0) return 1;
  const cellDuration = getCellDurationSeconds(loopSettings, subdivision);
  return duration / cellDuration;
}

/**
 * Get seconds from a grid column position
 */
export function gridPositionToSeconds(
  columnIndex: number,
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  const cellDuration = getCellDurationSeconds(loopSettings, subdivision);
  return columnIndex * cellDuration;
}

/**
 * Convert seconds to grid column position
 */
export function secondsToGridPosition(
  seconds: number,
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision
): number {
  const cellDuration = getCellDurationSeconds(loopSettings, subdivision);
  return Math.floor(seconds / cellDuration);
}

/**
 * Snap a fractional grid column to the nearest quantize grid position.
 * Mirrors the logic in quantize.ts but uses loopSettings.bpm directly.
 */
export function quantizeGridPosition(
  columnStart: number,
  loopSettings: LoopSettingsFE,
  subdivision: Subdivision,
  quantVal: string | number,
  totalColumns: number,
): number {
  const cellDuration = getCellDurationSeconds(loopSettings, subdivision);
  const secondsPerQuarterNote = 60 / loopSettings.bpm;
  let quantizeSeconds: number;
  const quantValStr = String(quantVal);
  if (quantValStr.includes("t")) {
    const tripletQuantVal = Number(quantValStr[0]) * 1.5;
    quantizeSeconds = (secondsPerQuarterNote / tripletQuantVal) * 4;
  } else {
    quantizeSeconds = (secondsPerQuarterNote / Number(quantValStr)) * 4;
  }
  const quantizeColumns = quantizeSeconds / cellDuration;
  const quantized = Math.round(columnStart / quantizeColumns) * quantizeColumns;
  // Wrap to loop start if quantized to the loop end (mirrors getScheduleEvents.ts)
  return quantized >= totalColumns ? 0 : quantized;
}
