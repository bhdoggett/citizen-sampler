import { createElement } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SampleTypeFE } from "src/types/audioTypesFE";
import { defaultLoopSettings } from "src/lib/audio/defaults";
import { createSongStore, type SongStore } from "src/lib/song/store";
import { SongStoreProvider } from "src/lib/song/react";
import useMutesAndSolos from "./useMutesAndSolos";

const sample = (id: string, solo = false, mute = false) =>
  ({ id, settings: { solo, mute, volume: 0 } }) as unknown as SampleTypeFE;

let store: SongStore;
// The current pads, read fresh after each update
let state: Record<string, SampleTypeFE>;

const render = () =>
  renderHook(() => useMutesAndSolos(), {
    wrapper: ({ children }) => createElement(SongStoreProvider, { store }, children),
  });

describe("useMutesAndSolos", () => {
  beforeEach(() => {
    store = createSongStore({
      samples: { a: sample("a", true), b: sample("b", true), c: sample("c") },
      loops: defaultLoopSettings(),
    });
    state = store.getState().samples;
    store.subscribe(() => {
      state = store.getState().samples;
    });
  });

  it("sets mute on one sample only", () => {
    const { result } = render();
    result.current.setSampleMute("a", true);
    expect(state.a.settings.mute).toBe(true);
    expect(state.b.settings.mute).toBe(false);
  });

  it("sets solo without touching other settings", () => {
    const { result } = render();
    result.current.setSampleSolo("c", true);
    expect(state.c.settings).toEqual({ solo: true, mute: false, volume: 0 });
  });

  it("turns solo off when a pad is muted", () => {
    const { result } = render();
    result.current.setSampleMute("a", true);
    expect(state.a.settings).toMatchObject({ mute: true, solo: false });
  });

  it("turns mute off when a pad is soloed", () => {
    store.updatePad("c", () => sample("c", false, true));
    const { result } = render();
    result.current.setSampleSolo("c", true);
    expect(state.c.settings).toMatchObject({ mute: false, solo: true });
  });

  it("leaves solo alone when a pad is unmuted", () => {
    const { result } = render();
    result.current.setSampleMute("b", false);
    expect(state.b.settings).toMatchObject({ mute: false, solo: true });
  });

  it("clears every solo", () => {
    const { result } = render();
    result.current.clearSolos();
    expect(Object.values(state).map((s) => s.settings.solo)).toEqual([
      false,
      false,
      false,
    ]);
  });
});
