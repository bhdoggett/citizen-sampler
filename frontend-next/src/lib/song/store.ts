import type {
  AllLoopSettingsFE,
  SampleEventFE,
  SampleSettingsFE,
  SampleTypeFE,
} from "src/types/audioTypesFE";
import type { LoopName } from "src/types/audioTypes";

export type Samples = Record<string, SampleTypeFE>;

// The song document: every pad and every loop. Saved songs, localStorage and
// the engine all read from this one copy.
export type SongState = {
  samples: Samples;
  loops: AllLoopSettingsFE;
};

export type SongStore = {
  getState: () => SongState;
  subscribe: (listener: () => void) => () => void;
  setSong: (song: SongState) => void;
  updateSamples: (updater: (prev: Samples) => Samples) => void;
  updatePad: (id: string, updater: (prev: SampleTypeFE) => SampleTypeFE) => void;
  setPadSettings: (id: string, settings: Partial<SampleSettingsFE>) => void;
  addEvent: (id: string, loop: LoopName, event: SampleEventFE) => void;
  updateLoops: (updater: (prev: AllLoopSettingsFE) => AllLoopSettingsFE) => void;
};

// Updates are immutable, so a pad that didn't change keeps its identity and
// subscribers to it can skip work.
export function createSongStore(initial: SongState): SongStore {
  let state = initial;
  const listeners = new Set<() => void>();

  const setState = (next: SongState) => {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const updateSamples = (updater: (prev: Samples) => Samples) => {
    const samples = updater(state.samples);
    if (samples !== state.samples) setState({ ...state, samples });
  };

  const updatePad = (
    id: string,
    updater: (prev: SampleTypeFE) => SampleTypeFE,
  ) => {
    updateSamples((prev) => {
      const pad = prev[id];
      if (!pad) return prev;
      const next = updater(pad);
      return next === pad ? prev : { ...prev, [id]: next };
    });
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSong: setState,
    updateSamples,
    updatePad,
    setPadSettings: (id, settings) =>
      updatePad(id, (pad) => ({
        ...pad,
        settings: { ...pad.settings, ...settings },
      })),
    addEvent: (id, loop, event) =>
      updatePad(id, (pad) => ({
        ...pad,
        events: { ...pad.events, [loop]: [...(pad.events[loop] ?? []), event] },
      })),
    updateLoops: (updater) => {
      const loops = updater(state.loops);
      if (loops !== state.loops) setState({ ...state, loops });
    },
  };
}
