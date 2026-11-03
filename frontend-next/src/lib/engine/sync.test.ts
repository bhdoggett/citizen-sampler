import { describe, expect, it } from "vitest";
import { connectStoreToEngine } from "./sync";
import { createSongStore } from "src/lib/song/store";
import { defaultLoopSettings, defaultSampleSettings } from "src/lib/audio/defaults";
import { emptyLoopEvents } from "src/lib/constants/loops";
import type { Engine, EngineCommand, EngineEvent } from "./protocol";
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

function fakeEngine() {
  const sent: EngineCommand[] = [];
  const listeners = new Set<(e: EngineEvent) => void>();
  const engine: Engine = {
    send: (command) => sent.push(command),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => Promise.resolve(),
    renderStem: () => Promise.resolve(null),
    dispose: () => {},
  };
  const emit = (event: EngineEvent) => listeners.forEach((l) => l(event));
  return { engine, sent, emit, listeners };
}

function setup() {
  const store = createSongStore({
    samples: { "pad-1": pad("pad-1"), "pad-2": pad("pad-2") },
    loops: defaultLoopSettings(),
  });
  const fake = fakeEngine();
  const disconnect = connectStoreToEngine(store, fake.engine);
  return { store, ...fake, disconnect };
}

describe("connectStoreToEngine", () => {
  it("sends every pad and the loops on connect", () => {
    const { sent } = setup();
    expect(sent.map((c) => c.type)).toEqual(["setLoops", "setPad", "setPad"]);
  });

  it("sends only the pad that changed", () => {
    const { store, sent } = setup();
    sent.length = 0;
    store.setPadSettings("pad-2", { volume: -3 });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: "setPad", padId: "pad-2" });
  });

  it("sends the loops when they change and nothing else", () => {
    const { store, sent } = setup();
    sent.length = 0;
    store.updateLoops((prev) => ({ ...prev, A: { ...prev.A!, bpm: 100 } }));
    expect(sent.map((c) => c.type)).toEqual(["setLoops"]);
  });

  it("removes pads that leave the song", () => {
    const { store, sent } = setup();
    sent.length = 0;
    const { samples } = store.getState();
    store.setSong({ samples: { "pad-1": samples["pad-1"] }, loops: store.getState().loops });
    expect(sent).toEqual([{ type: "removePad", padId: "pad-2" }]);
  });

  it("commits recorded hits to the store", () => {
    const { store, emit } = setup();
    const event = { startTime: 0, duration: 0.5, note: "C4", velocity: 1 };
    emit({ type: "hitRecorded", padId: "pad-1", loop: "C", event });
    expect(store.getState().samples["pad-1"].events.C).toEqual([event]);
  });

  it("stops following after disconnect", () => {
    const { store, sent, disconnect, listeners } = setup();
    disconnect();
    sent.length = 0;
    store.setPadSettings("pad-1", { pan: 1 });
    expect(sent).toEqual([]);
    expect(listeners.size).toBe(0);
  });
});
