import type { LoopName } from "src/types/audioTypes";

export const LOOP_NAMES: readonly LoopName[] = ["A", "B", "C", "D"];

export function isLoopName(value: string): value is LoopName {
  return (LOOP_NAMES as readonly string[]).includes(value);
}

// A fresh record per call, so callers never share event arrays
export function emptyLoopEvents<T>(): Record<LoopName, T[]> {
  return { A: [], B: [], C: [], D: [] };
}
