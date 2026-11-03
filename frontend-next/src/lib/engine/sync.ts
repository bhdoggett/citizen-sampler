import type { SongState, SongStore } from "src/lib/song/store";
import type { Engine, PadState } from "./protocol";

const padState = ({ url, settings, events }: SongState["samples"][string]): PadState => ({
  url,
  settings,
  events,
});

// The engine follows the song one way: every change to a pad or the loops is
// sent as a command, and recorded hits come back as store updates.
export function connectStoreToEngine(store: SongStore, engine: Engine): () => void {
  let sent: SongState | null = null;

  const push = () => {
    const state = store.getState();
    if (state.loops !== sent?.loops) {
      engine.send({ type: "setLoops", loops: state.loops });
    }
    for (const [padId, pad] of Object.entries(state.samples)) {
      if (pad !== sent?.samples[padId]) {
        engine.send({ type: "setPad", padId, pad: padState(pad) });
      }
    }
    for (const padId of Object.keys(sent?.samples ?? {})) {
      if (!(padId in state.samples)) engine.send({ type: "removePad", padId });
    }
    sent = state;
  };

  push();
  const unsubscribeStore = store.subscribe(push);
  const unsubscribeEngine = engine.subscribe((event) => {
    if (event.type === "hitRecorded") {
      store.addEvent(event.padId, event.loop, event.event);
    }
  });

  return () => {
    unsubscribeStore();
    unsubscribeEngine();
  };
}
