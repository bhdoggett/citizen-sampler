import { describe, expect, it, vi } from "vitest";
import { createSongStore } from "./store";
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

function makeStore() {
  return createSongStore({
    samples: { "pad-1": pad("pad-1"), "pad-2": pad("pad-2") },
    loops: defaultLoopSettings(),
  });
}

describe("createSongStore", () => {
  it("keeps untouched pads when one pad's settings change", () => {
    const store = makeStore();
    const before = store.getState();
    store.setPadSettings("pad-1", { volume: -6 });
    const after = store.getState();
    expect(after.samples["pad-1"].settings.volume).toBe(-6);
    expect(after.samples["pad-2"]).toBe(before.samples["pad-2"]);
    expect(after.samples["pad-1"].events).toBe(before.samples["pad-1"].events);
    expect(after.loops).toBe(before.loops);
  });

  it("appends a recorded hit to one loop of one pad", () => {
    const store = makeStore();
    const hit = { startTime: 96, duration: 0.25, note: "C4", velocity: 1 };
    store.addEvent("pad-2", "B", hit);
    const { samples } = store.getState();
    expect(samples["pad-2"].events.B).toEqual([hit]);
    expect(samples["pad-2"].events.A).toEqual([]);
  });

  it("ignores hits for pads that no longer exist", () => {
    const store = makeStore();
    const before = store.getState();
    store.addEvent("pad-9", "A", { startTime: 0, duration: 1, note: "C4", velocity: 1 });
    expect(store.getState()).toBe(before);
  });

  it("notifies subscribers once per change and stops after unsubscribe", () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setPadSettings("pad-1", { pan: 0.5 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setPadSettings("pad-1", { pan: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips the notification when an updater returns the same state", () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.updateSamples((prev) => prev);
    store.updateLoops((prev) => prev);
    expect(listener).not.toHaveBeenCalled();
  });

  it("replaces every pad and loop at once", () => {
    const store = makeStore();
    const loops = defaultLoopSettings();
    store.setSong({ samples: { "pad-3": pad("pad-3") }, loops });
    expect(Object.keys(store.getState().samples)).toEqual(["pad-3"]);
    expect(store.getState().loops).toBe(loops);
  });

  it("updates one loop's settings", () => {
    const store = makeStore();
    store.updateLoops((prev) => ({ ...prev, A: { ...prev.A!, bpm: 90 } }));
    expect(store.getState().loops.A?.bpm).toBe(90);
  });
});
