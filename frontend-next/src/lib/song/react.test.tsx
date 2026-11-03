import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createSongStore } from "./store";
import { SongStoreProvider, selectLoopEvents, useLoopEvents, usePad } from "./react";
import { defaultLoopSettings, defaultSampleSettings } from "src/lib/audio/defaults";
import { emptyLoopEvents } from "src/lib/constants/loops";
import type { SampleTypeFE } from "src/types/audioTypesFE";

function pad(id: string): SampleTypeFE {
  return {
    id,
    title: id,
    type: "kit",
    collectionName: "test",
    url: `https://example.com/${id}.wav`,
    events: emptyLoopEvents(),
    settings: defaultSampleSettings(),
  };
}

function setup() {
  const store = createSongStore({
    samples: { "pad-1": pad("pad-1"), "pad-2": pad("pad-2") },
    loops: defaultLoopSettings(),
  });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <SongStoreProvider store={store}>{children}</SongStoreProvider>
  );
  return { store, wrapper };
}

describe("usePad", () => {
  it("does not re-render when another pad changes", () => {
    const { store, wrapper } = setup();
    let renders = 0;
    renderHook(
      () => {
        renders++;
        return usePad("pad-1");
      },
      { wrapper },
    );
    const before = renders;
    act(() => store.setPadSettings("pad-2", { volume: -12 }));
    expect(renders).toBe(before);
    act(() => store.setPadSettings("pad-1", { volume: -12 }));
    expect(renders).toBe(before + 1);
  });
});

describe("useLoopEvents", () => {
  it("does not re-render on a settings change", () => {
    const { store, wrapper } = setup();
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders++;
        return useLoopEvents("A");
      },
      { wrapper },
    );
    const before = renders;
    act(() => store.setPadSettings("pad-2", { pan: 1 }));
    expect(renders).toBe(before);
    act(() =>
      store.addEvent("pad-2", "A", { startTime: 0, duration: 1, note: "C4", velocity: 1 }),
    );
    expect(renders).toBe(before + 1);
    expect(result.current["pad-2"]).toHaveLength(1);
  });
});

describe("selectLoopEvents", () => {
  it("returns the same object for the same samples", () => {
    const { store } = setup();
    const samples = store.getState().samples;
    expect(selectLoopEvents(samples, "A")).toBe(selectLoopEvents(samples, "A"));
  });
});
