"use client";
import { useEffect, useSyncExternalStore } from "react";

// Which pads are sounding, keyed by pad id, with one entry per source
// (drum pad, sequencer pad button) so one releasing doesn't clear the other.
// Kept outside React context so a hit only re-renders components whose
// answer changes, not every pad.
const playing = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

export function setPadPlaying(padId: string, source: string, isPlaying: boolean) {
  const sources = playing.get(padId) ?? new Set<string>();
  const wasPlaying = sources.size > 0;
  if (isPlaying) sources.add(source);
  else sources.delete(source);
  if (sources.size > 0) playing.set(padId, sources);
  else playing.delete(padId);
  if (wasPlaying !== sources.size > 0) listeners.forEach((l) => l());
}

export function isPadPlaying(padId: string): boolean {
  return playing.has(padId);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Subscribe to whether a pad is sounding. Pass null to opt out (always false).
export function usePadPlaying(padId: string | null): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (padId ? playing.has(padId) : false),
    () => false,
  );
}

// Report a component's playing state for a pad, clearing it on unmount.
export function useReportPadPlaying(
  padId: string,
  source: string,
  isPlaying: boolean,
) {
  useEffect(() => {
    setPadPlaying(padId, source, isPlaying);
    return () => setPadPlaying(padId, source, false);
  }, [padId, source, isPlaying]);
}
