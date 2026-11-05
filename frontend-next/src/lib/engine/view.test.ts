import { describe, expect, it, vi } from "vitest";
import { createEngineView } from "./view";
import type { EngineEvent } from "./protocol";

function setup(now = 1000) {
  const listeners = new Set<(e: EngineEvent) => void>();
  const subscribe = (listener: (e: EngineEvent) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const view = createEngineView(subscribe, () => now);
  const emit = (event: EngineEvent) => listeners.forEach((l) => l(event));
  return { view, emit };
}

describe("createEngineView", () => {
  it("starts stopped on loop A with nothing loading", () => {
    const { view } = setup();
    const state = view.getState();
    expect(state.transport.playing).toBe(false);
    expect(state.transport.loop).toBe("A");
    expect(state.loadingPads).toBe(0);
  });

  it("stamps each transport event with its arrival time", () => {
    const { view, emit } = setup(5000);
    emit({ type: "transport", playing: true, recording: true, loop: "B", position: 0.5, loopDuration: 4 });
    expect(view.getState().transport).toMatchObject({ playing: true, loop: "B", receivedAt: 5000 });
  });

  it("tracks which notes each pad is sounding", () => {
    const { view, emit } = setup();
    emit({ type: "voiceStarted", padId: "pad-1", note: "C4" });
    emit({ type: "voiceStarted", padId: "pad-1", note: "E4" });
    expect(view.isPadPlaying("pad-1")).toBe(true);
    expect(view.isNotePlaying("pad-1", "E4")).toBe(true);
    emit({ type: "voiceEnded", padId: "pad-1", note: "C4" });
    expect(view.isPadPlaying("pad-1")).toBe(true);
    emit({ type: "voiceEnded", padId: "pad-1", note: "E4" });
    expect(view.isPadPlaying("pad-1")).toBe(false);
  });

  it("keeps the voice state object when an unrelated event arrives", () => {
    const { view, emit } = setup();
    emit({ type: "voiceStarted", padId: "pad-1", note: "C4" });
    const voices = view.getState().voices;
    emit({ type: "loading", pending: 2 });
    expect(view.getState().voices).toBe(voices);
    expect(view.getState().loadingPads).toBe(2);
  });

  it("remembers the latest voice start per pad for the waveform playhead", () => {
    const { view, emit } = setup(2000);
    emit({ type: "voiceStarted", padId: "pad-3", note: "G4" });
    expect(view.getState().lastVoice["pad-3"]).toEqual({ note: "G4", startedAt: 2000, endedAt: null });
    emit({ type: "voiceEnded", padId: "pad-3", note: "G4" });
    expect(view.getState().lastVoice["pad-3"].endedAt).toBe(2000);
  });

  it("holds the latest pitch reading and preview", () => {
    const { view, emit } = setup(10);
    emit({ type: "pitch", padId: "pad-1", frequency: 440 });
    emit({ type: "previewStarted", url: "u", duration: 2 });
    expect(view.getState().pitch).toEqual({ padId: "pad-1", frequency: 440 });
    expect(view.getState().preview).toEqual({ url: "u", duration: 2, startedAt: 10 });
    emit({ type: "previewEnded", url: "u" });
    expect(view.getState().preview).toBeNull();
  });

  it("ignores a preview end for a different url", () => {
    const { view, emit } = setup();
    emit({ type: "previewStarted", url: "new", duration: 2 });
    emit({ type: "previewEnded", url: "old" });
    expect(view.getState().preview?.url).toBe("new");
  });

  it("notifies subscribers on change", () => {
    const { view, emit } = setup();
    const listener = vi.fn();
    view.subscribe(listener);
    emit({ type: "loading", pending: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("starts as a standalone kit and follows hostContext events", () => {
    const { view, emit } = setup();
    expect(view.getState().host).toEqual({
      isPlugin: false,
      layout: "kit",
      tempo: null,
      hostPlaying: false,
    });
    emit({ type: "hostContext", isPlugin: true, layout: "multiOut", tempo: 128, hostPlaying: true });
    expect(view.getState().host).toEqual({
      isPlugin: true,
      layout: "multiOut",
      tempo: 128,
      hostPlaying: true,
    });
  });
});
