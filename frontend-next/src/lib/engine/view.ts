import type { EngineEvent } from "./protocol";
import type { TransportAnchor } from "./transportClock";

type VoiceStart = { note: string; startedAt: number; endedAt: number | null };

// What the UI knows about the engine, built only from engine events
export type EngineViewState = {
  transport: TransportAnchor;
  // Sounding notes per pad
  voices: Record<string, readonly string[]>;
  // Latest voice per pad, for the waveform playhead
  lastVoice: Record<string, VoiceStart>;
  loadingPads: number;
  pitch: { padId: string; frequency: number | null } | null;
  preview: { url: string; duration: number; startedAt: number } | null;
};

export type EngineView = {
  getState: () => EngineViewState;
  subscribe: (listener: () => void) => () => void;
  isPadPlaying: (padId: string) => boolean;
  isNotePlaying: (padId: string, note: string) => boolean;
  dispose: () => void;
};

const initialState = (now: number): EngineViewState => ({
  transport: {
    type: "transport",
    playing: false,
    recording: false,
    loop: "A",
    position: 0,
    loopDuration: 0,
    receivedAt: now,
  },
  voices: {},
  lastVoice: {},
  loadingPads: 0,
  pitch: null,
  preview: null,
});

function reduce(
  state: EngineViewState,
  event: EngineEvent,
  now: number,
): EngineViewState {
  switch (event.type) {
    case "transport":
      return { ...state, transport: { ...event, receivedAt: now } };
    case "voiceStarted": {
      const notes = state.voices[event.padId] ?? [];
      return {
        ...state,
        voices: notes.includes(event.note)
          ? state.voices
          : { ...state.voices, [event.padId]: [...notes, event.note] },
        lastVoice: {
          ...state.lastVoice,
          [event.padId]: { note: event.note, startedAt: now, endedAt: null },
        },
      };
    }
    case "voiceEnded": {
      const notes = state.voices[event.padId] ?? [];
      const last = state.lastVoice[event.padId];
      const voices = { ...state.voices };
      const remaining = notes.filter((note) => note !== event.note);
      if (remaining.length > 0) voices[event.padId] = remaining;
      else delete voices[event.padId];
      return {
        ...state,
        voices: notes.includes(event.note) ? voices : state.voices,
        lastVoice:
          last && last.note === event.note && last.endedAt === null
            ? { ...state.lastVoice, [event.padId]: { ...last, endedAt: now } }
            : state.lastVoice,
      };
    }
    case "loading":
      return { ...state, loadingPads: event.pending };
    case "pitch":
      return { ...state, pitch: { padId: event.padId, frequency: event.frequency } };
    case "previewStarted":
      return {
        ...state,
        preview: { url: event.url, duration: event.duration, startedAt: now },
      };
    case "previewEnded":
      return state.preview?.url === event.url ? { ...state, preview: null } : state;
    default:
      return state;
  }
}

export function createEngineView(
  subscribeToEngine: (listener: (event: EngineEvent) => void) => () => void,
  now: () => number = () => performance.now(),
): EngineView {
  let state = initialState(now());
  const listeners = new Set<() => void>();

  const unsubscribe = subscribeToEngine((event) => {
    const next = reduce(state, event, now());
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  });

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isPadPlaying: (padId) => (state.voices[padId]?.length ?? 0) > 0,
    isNotePlaying: (padId, note) => state.voices[padId]?.includes(note) ?? false,
    dispose: unsubscribe,
  };
}
