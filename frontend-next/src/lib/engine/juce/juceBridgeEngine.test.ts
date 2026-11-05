import { afterEach, describe, expect, it, vi } from "vitest";
import { JuceBridgeEngine, hasJuceBackend } from "./juceBridgeEngine";
import type { EngineEvent } from "../protocol";

type Listener = (payload: unknown) => void;

// Stand-in for the backend object JUCE injects into its WebView
function installBackend() {
  const listeners = new Map<string, Set<Listener>>();
  const emitted: { id: string; payload: unknown }[] = [];
  const backend = {
    addEventListener: (id: string, fn: Listener) => {
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id)!.add(fn);
      return [id, fn];
    },
    removeEventListener: ([id, fn]: [string, Listener]) => {
      listeners.get(id)?.delete(fn);
    },
    emitEvent: (id: string, payload: unknown) => emitted.push({ id, payload }),
  };
  (window as unknown as { __JUCE__?: unknown }).__JUCE__ = {
    backend,
    initialisationData: { __juce__functions: ["renderStem"] },
  };
  const fire = (id: string, payload: unknown) =>
    listeners.get(id)?.forEach((fn) => fn(payload));
  return { backend, emitted, fire, listeners };
}

afterEach(() => {
  delete (window as unknown as { __JUCE__?: unknown }).__JUCE__;
});

describe("hasJuceBackend", () => {
  it("is false in a plain browser", () => {
    expect(hasJuceBackend()).toBe(false);
  });

  it("is true inside the JUCE WebView", () => {
    installBackend();
    expect(hasJuceBackend()).toBe(true);
  });
});

describe("JuceBridgeEngine", () => {
  it("asks the engine for the host context once its listeners are attached", () => {
    const { backend, emitted, listeners } = installBackend();
    // Events sent before the page listens are lost, so the request must
    // go out after the engineEvent listener is attached
    const listenersAtEmit: number[] = [];
    const emit = backend.emitEvent;
    vi.spyOn(backend, "emitEvent").mockImplementation((id, payload) => {
      listenersAtEmit.push(listeners.get("engineEvent")?.size ?? 0);
      return emit(id, payload);
    });
    new JuceBridgeEngine();
    expect(emitted).toEqual([
      { id: "engineCommand", payload: { type: "requestHostContext" } },
    ]);
    expect(listenersAtEmit).toEqual([1]);
  });

  it("sends commands to the backend as engineCommand events", () => {
    const { emitted } = installBackend();
    const engine = new JuceBridgeEngine();
    emitted.length = 0;
    engine.send({ type: "press", padId: "pad-1", note: "C4", velocity: 1 });
    expect(emitted).toEqual([
      {
        id: "engineCommand",
        payload: { type: "press", padId: "pad-1", note: "C4", velocity: 1 },
      },
    ]);
  });

  it("passes engineEvent events to subscribers", () => {
    const { fire } = installBackend();
    const engine = new JuceBridgeEngine();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    const event: EngineEvent = { type: "voiceStarted", padId: "pad-2", note: "C4" };
    fire("engineEvent", event);
    expect(listener).toHaveBeenCalledWith(event);
    unsubscribe();
    fire("engineEvent", event);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("renders stems through the native function and returns float channels", async () => {
    const { emitted, fire } = installBackend();
    const engine = new JuceBridgeEngine();
    const pending = engine.renderStem("pad-1", "B");

    const call = emitted.find((e) => e.id === "__juce__invoke");
    expect(call?.payload).toMatchObject({ name: "renderStem", params: ["pad-1", "B"] });
    const { resultId } = call!.payload as { resultId: number };
    fire("__juce__complete", {
      promiseId: resultId,
      result: { sampleRate: 48000, channels: [[0, 0.5], [0, -0.5]] },
    });

    const stem = await pending;
    expect(stem?.sampleRate).toBe(48000);
    expect(stem?.channels[1]).toBeInstanceOf(Float32Array);
    expect(Array.from(stem!.channels[1])).toEqual([0, -0.5]);
  });

  it("returns null when the backend has no stem", async () => {
    const { emitted, fire } = installBackend();
    const engine = new JuceBridgeEngine();
    const pending = engine.renderStem("pad-1", "A");
    const call = emitted.find((e) => e.id === "__juce__invoke");
    const { resultId } = call!.payload as { resultId: number };
    fire("__juce__complete", { promiseId: resultId, result: null });
    expect(await pending).toBeNull();
  });

  it("stops listening when disposed", () => {
    const { listeners } = installBackend();
    const engine = new JuceBridgeEngine();
    engine.dispose();
    expect(listeners.get("engineEvent")?.size ?? 0).toBe(0);
    expect(listeners.get("__juce__complete")?.size ?? 0).toBe(0);
  });
});
