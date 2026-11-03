import type {
  AllLoopSettingsFE,
  SampleEventFE,
  SampleTypeFE,
} from "src/types/audioTypesFE";
import type { LoopName } from "src/types/audioTypes";

// The boundary between the UI and whatever makes the sound: Tone.js in the
// browser, the C++ engine in the desktop app. Everything that crosses it is
// plain data, so it can be sent as JSON.

export type PadState = Pick<SampleTypeFE, "url" | "settings" | "events">;

export type EngineCommand =
  | { type: "setPad"; padId: string; pad: PadState }
  | { type: "removePad"; padId: string }
  | { type: "setLoops"; loops: AllLoopSettingsFE }
  | { type: "setCurrentLoop"; loop: LoopName }
  | { type: "play" }
  | { type: "stop" }
  | { type: "setRecording"; on: boolean }
  | { type: "setMetronome"; on: boolean }
  // note is the trigger note, already transposed for the pad's base note
  | { type: "press"; padId: string; note: string; velocity: number }
  | { type: "release"; padId: string; note: string }
  | { type: "setTunerPad"; padId: string | null }
  | { type: "previewSample"; url: string }
  | { type: "stopPreview" };

export type TransportEvent = {
  type: "transport";
  playing: boolean;
  recording: boolean;
  loop: LoopName;
  // Seconds into the loop when the event was sent
  position: number;
  loopDuration: number;
};

export type EngineEvent =
  | TransportEvent
  | { type: "voiceStarted"; padId: string; note: string }
  | { type: "voiceEnded"; padId: string; note: string }
  | { type: "hitRecorded"; padId: string; loop: LoopName; event: SampleEventFE }
  | { type: "loading"; pending: number }
  | { type: "padLoaded"; padId: string; duration: number }
  | { type: "padLoadFailed"; padId: string; message: string }
  | { type: "pitch"; padId: string; frequency: number | null }
  | { type: "previewStarted"; url: string; duration: number }
  | { type: "previewEnded"; url: string };

export type StemAudio = {
  sampleRate: number;
  channels: Float32Array[];
};

export interface Engine {
  send(command: EngineCommand): void;
  subscribe(listener: (event: EngineEvent) => void): () => void;
  // Browsers only allow audio after a user gesture
  start(): Promise<void>;
  renderStem(padId: string, loop: LoopName): Promise<StemAudio | null>;
  dispose(): void;
}
