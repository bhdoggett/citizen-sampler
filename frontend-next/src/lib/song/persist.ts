import { writeJSON } from "src/lib/storage";
import type { SongState, SongStore } from "./store";

// Save the song to localStorage once edits settle, so dragging a slider
// doesn't write on every step. Pending edits are flushed when the page is
// hidden or persistence stops.
export function persistSong(store: SongStore, delayMs = 500): () => void {
  let written: SongState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const state = store.getState();
    if (state.samples !== written?.samples) writeJSON("samples", state.samples);
    if (state.loops !== written?.loops) writeJSON("loops", state.loops);
    written = state;
  };

  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };

  const unsubscribe = store.subscribe(schedule);
  window.addEventListener("pagehide", flush);

  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", flush);
    if (timer !== null) flush();
  };
}
