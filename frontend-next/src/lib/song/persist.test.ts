import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSongStore } from "./store";
import { persistSong } from "./persist";
import { defaultLoopSettings } from "src/lib/audio/defaults";
import { readJSON } from "src/lib/storage";

describe("persistSong", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const store = createSongStore({ samples: {}, loops: defaultLoopSettings() });
    const stop = persistSong(store, 500);
    return { store, stop };
  };

  it("writes once after changes settle", () => {
    const { store } = setup();
    store.updateLoops((prev) => ({ ...prev, A: { ...prev.A!, bpm: 90 } }));
    store.updateLoops((prev) => ({ ...prev, A: { ...prev.A!, bpm: 91 } }));
    expect(readJSON<{ A: { bpm: number } }>("loops")?.A.bpm).toBe(120);
    vi.advanceTimersByTime(500);
    expect(readJSON<{ A: { bpm: number } }>("loops")?.A.bpm).toBe(91);
  });

  it("flushes pending changes when stopped", () => {
    const { store, stop } = setup();
    store.updateLoops((prev) => ({ ...prev, B: { ...prev.B!, bpm: 70 } }));
    stop();
    expect(readJSON<{ B: { bpm: number } }>("loops")?.B.bpm).toBe(70);
  });

  it("saves the song it starts with, so a new random song survives a reload", () => {
    setup();
    expect(readJSON("samples")).toEqual({});
    expect(readJSON("loops")).not.toBeNull();
  });

  it("does not write again when nothing changed", () => {
    setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    window.dispatchEvent(new Event("pagehide"));
    vi.advanceTimersByTime(1000);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("flushes when the page is hidden", () => {
    const { store } = setup();
    store.updateLoops((prev) => ({ ...prev, C: { ...prev.C!, bpm: 60 } }));
    window.dispatchEvent(new Event("pagehide"));
    expect(readJSON<{ C: { bpm: number } }>("loops")?.C.bpm).toBe(60);
  });
});
