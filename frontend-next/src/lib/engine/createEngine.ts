import type { Engine } from "./protocol";
import { ToneEngine } from "./tone/toneEngine";
import { JuceBridgeEngine, hasJuceBackend } from "./juce/juceBridgeEngine";
import { createEngineView, type EngineView } from "./view";

let engine: Engine | null = null;
let view: EngineView | null = null;

// One engine per page. Tone's transport is global, so a second Tone engine
// would schedule everything twice. Inside the desktop app the C++ engine
// makes the sound instead.
export function getEngine(): Engine {
  engine ??= hasJuceBackend() ? new JuceBridgeEngine() : new ToneEngine();
  return engine;
}

// The UI's view of that engine. It lives as long as the engine, so it never
// misses an event while React mounts and remounts.
export function getEngineView(): EngineView {
  const current = getEngine();
  view ??= createEngineView((listener) => current.subscribe(listener));
  return view;
}
