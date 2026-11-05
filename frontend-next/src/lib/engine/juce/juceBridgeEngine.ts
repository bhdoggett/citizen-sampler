import type { LoopName } from "src/types/audioTypes";
import type { Engine, EngineCommand, EngineEvent, StemAudio } from "../protocol";

// The object JUCE's WebBrowserComponent injects when native integration is on
type ListenerToken = unknown;
type JuceBackend = {
  addEventListener: (eventId: string, fn: (payload: unknown) => void) => ListenerToken;
  removeEventListener: (token: ListenerToken) => void;
  emitEvent: (eventId: string, payload: unknown) => void;
};

type JuceWindow = Window & { __JUCE__?: { backend?: JuceBackend } };

function juceBackend(): JuceBackend | null {
  if (typeof window === "undefined") return null;
  return (window as JuceWindow).__JUCE__?.backend ?? null;
}

// True when the UI runs inside the desktop app or plugin
export function hasJuceBackend(): boolean {
  return juceBackend() !== null;
}

// Event ids shared with engine/juce/Bridge.h
const COMMAND_EVENT = "engineCommand";
const ENGINE_EVENT = "engineEvent";
// JUCE's own native function protocol (see juce_gui_extra/native/javascript)
const INVOKE_EVENT = "__juce__invoke";
const COMPLETE_EVENT = "__juce__complete";

type WireStem = { sampleRate: number; channels: number[][] } | null;

// The desktop engine: commands go to the C++ engine through the JUCE
// WebView, and its events come back the same way.
export class JuceBridgeEngine implements Engine {
  private backend: JuceBackend;
  private listeners = new Set<(event: EngineEvent) => void>();
  private pending = new Map<number, (result: unknown) => void>();
  private nextPromiseId = 0;
  private tokens: ListenerToken[];

  constructor() {
    const backend = juceBackend();
    if (!backend) throw new Error("JuceBridgeEngine needs the JUCE WebView backend");
    this.backend = backend;
    this.tokens = [
      backend.addEventListener(ENGINE_EVENT, (payload) => {
        this.listeners.forEach((listener) => listener(payload as EngineEvent));
      }),
      backend.addEventListener(COMPLETE_EVENT, (payload) => {
        const { promiseId, result } = payload as { promiseId: number; result: unknown };
        this.pending.get(promiseId)?.(result);
        this.pending.delete(promiseId);
      }),
    ];
    // The engine's startup hostContext may have gone out before the page
    // was listening
    this.send({ type: "requestHostContext" });
  }

  send(command: EngineCommand): void {
    this.backend.emitEvent(COMMAND_EVENT, command);
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // The native audio device needs no user gesture
  start(): Promise<void> {
    return Promise.resolve();
  }

  async renderStem(padId: string, loop: LoopName): Promise<StemAudio | null> {
    const result = (await this.invoke("renderStem", [padId, loop])) as WireStem;
    if (!result) return null;
    return {
      sampleRate: result.sampleRate,
      channels: result.channels.map((channel) => Float32Array.from(channel)),
    };
  }

  dispose(): void {
    this.tokens.forEach((token) => this.backend.removeEventListener(token));
    this.tokens = [];
    this.listeners.clear();
    this.pending.clear();
  }

  private invoke(name: string, params: unknown[]): Promise<unknown> {
    const resultId = this.nextPromiseId++;
    return new Promise((resolve) => {
      this.pending.set(resultId, resolve);
      this.backend.emitEvent(INVOKE_EVENT, { name, params, resultId });
    });
  }
}
