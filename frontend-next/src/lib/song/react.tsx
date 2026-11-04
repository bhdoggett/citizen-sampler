"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import type { SampleEventFE } from "src/types/audioTypesFE";
import type { LoopName } from "src/types/audioTypes";
import type { Samples, SongState, SongStore } from "./store";

const SongStoreContext = createContext<SongStore | null>(null);

export function SongStoreProvider({
  store,
  children,
}: React.PropsWithChildren<{ store: SongStore }>) {
  return (
    <SongStoreContext.Provider value={store}>{children}</SongStoreContext.Provider>
  );
}

export function useSongStore(): SongStore {
  const store = useContext(SongStoreContext);
  if (!store) throw new Error("useSongStore must be used within a SongStoreProvider");
  return store;
}

// Re-renders only when the selected value changes identity, so selectors
// must return values already in the state, not new objects.
export function useSongSelector<T>(selector: (state: SongState) => T): T {
  const store = useSongStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export const useAllSamples = () => useSongSelector((state) => state.samples);
export const useLoops = () => useSongSelector((state) => state.loops);
export const usePad = (id: string) => useSongSelector((state) => state.samples[id]);

// Events of one loop for every pad. The result is cached and only rebuilt
// when some pad's events change, so settings edits don't re-render views that
// only draw events.
type EventsByPad = Record<string, SampleEventFE[]>;
const eventsCache = new WeakMap<Samples, Map<LoopName, EventsByPad>>();
let lastEvents: { loop: LoopName; value: EventsByPad } | null = null;

export function selectLoopEvents(samples: Samples, loop: LoopName): EventsByPad {
  const perLoop = eventsCache.get(samples)?.get(loop);
  if (perLoop) return perLoop;

  const next: EventsByPad = {};
  for (const [id, pad] of Object.entries(samples)) next[id] = pad.events[loop] ?? [];

  // Reuse the previous result when no pad's events changed
  const prev = lastEvents?.loop === loop ? lastEvents.value : null;
  const same =
    prev !== null &&
    Object.keys(prev).length === Object.keys(next).length &&
    Object.entries(next).every(([id, events]) => prev[id] === events);
  const value = same ? prev : next;

  const map = eventsCache.get(samples) ?? new Map<LoopName, EventsByPad>();
  map.set(loop, value);
  eventsCache.set(samples, map);
  lastEvents = { loop, value };
  return value;
}

export const useLoopEvents = (loop: LoopName) =>
  useSongSelector((state) => selectLoopEvents(state.samples, loop));
