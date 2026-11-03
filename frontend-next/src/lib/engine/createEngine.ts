import type { Engine } from "./protocol";
import { ToneEngine } from "./tone/toneEngine";

let engine: Engine | null = null;

// One engine per page. Tone's transport is global, so a second Tone engine
// would schedule everything twice.
export function getEngine(): Engine {
  engine ??= new ToneEngine();
  return engine;
}
