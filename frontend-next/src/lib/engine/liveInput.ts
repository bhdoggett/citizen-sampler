import { resolveRelease } from "src/lib/audio/padRelease";
import { calcEventDuration } from "src/lib/audio/util/calcEventDuration";
import { wrapTicks, type LoopTiming } from "src/lib/audio/util/timing";
import type { LoopName } from "src/types/audioTypes";
import type { EngineEvent } from "./protocol";

type TimerHandle = unknown;

// What live input needs from the engine around it. Kept as plain functions
// so the rules can be tested without audio.
export type LiveInputDeps = {
  // Start the sound. Returns ms until it ends on its own, or null when the
  // pad has nothing loaded.
  attack: (padId: string, note: string, velocity: number) => number | null;
  releaseVoice: (padId: string, note: string) => void;
  padSettings: (padId: string) => { oneShot: boolean; end: number | null };
  // Where a hit pressed now would land, or null when not recording
  recordingPosition: () => { loop: LoopName; ticks: number } | null;
  isRecording: () => boolean;
  transportSeconds: () => number;
  loopTiming: (loop: LoopName) => LoopTiming | null;
  emit: (event: EngineEvent) => void;
  setTimer: (fn: () => void, ms: number) => TimerHandle;
  clearTimer: (handle: TimerHandle) => void;
};

type PendingHit = { loop: LoopName; startTicks: number; velocity: number };

type HeldNote = {
  padId: string;
  note: string;
  // True from press to release, whatever the sound is doing in between
  held: boolean;
  audioReleased: boolean;
  timer: TimerHandle | null;
  pending: PendingHit | null;
};

export type LiveInput = {
  press: (padId: string, note: string, velocity: number) => void;
  release: (padId: string, note: string) => void;
  // Stop every live voice and forget pending hits
  reset: () => void;
};

// Press and release from keys, mouse, touch or MIDI. A hit is held here from
// press to release and committed once, on release, as a hitRecorded event.
export function createLiveInput(deps: LiveInputDeps): LiveInput {
  const notes = new Map<string, HeldNote>();
  const keyOf = (padId: string, note: string) => `${padId}|${note}`;

  const endVoice = (entry: HeldNote) => {
    if (entry.timer !== null) deps.clearTimer(entry.timer);
    entry.timer = null;
    entry.audioReleased = true;
    deps.releaseVoice(entry.padId, entry.note);
    deps.emit({ type: "voiceEnded", padId: entry.padId, note: entry.note });
  };

  const forgetIfDone = (key: string, entry: HeldNote) => {
    if (!entry.held && entry.audioReleased) notes.delete(key);
  };

  const press = (padId: string, note: string, velocity: number) => {
    const key = keyOf(padId, note);
    const previous = notes.get(key);
    if (previous?.timer != null) deps.clearTimer(previous.timer);

    const soundMs = deps.attack(padId, note, velocity);
    if (soundMs === null) {
      notes.delete(key);
      return;
    }

    const position = deps.recordingPosition();
    const entry: HeldNote = {
      padId,
      note,
      held: true,
      audioReleased: false,
      timer: null,
      pending: position
        ? { loop: position.loop, startTicks: position.ticks, velocity }
        : null,
    };
    entry.timer = deps.setTimer(() => {
      entry.timer = null;
      if (entry.audioReleased) return;
      endVoice(entry);
      forgetIfDone(key, entry);
    }, soundMs);
    notes.set(key, entry);
    deps.emit({ type: "voiceStarted", padId, note });
  };

  const release = (padId: string, note: string) => {
    const key = keyOf(padId, note);
    const entry = notes.get(key);
    const settings = deps.padSettings(padId);
    const { releaseAudio, record } = resolveRelease({
      held: entry?.held ?? false,
      oneShot: settings.oneShot,
      audioReleased: entry?.audioReleased ?? true,
    });
    if (!entry || !record) return;

    entry.held = false;
    if (releaseAudio) endVoice(entry);
    forgetIfDone(key, entry);

    const pending = entry.pending;
    entry.pending = null;
    if (!pending || !deps.isRecording()) return;
    const timing = deps.loopTiming(pending.loop);
    if (!timing) return;

    const startTime = wrapTicks(pending.startTicks, timing);
    const duration = calcEventDuration(
      startTime,
      deps.transportSeconds(),
      timing,
      settings.end,
    );
    deps.emit({
      type: "hitRecorded",
      padId,
      loop: pending.loop,
      event: { startTime, duration, note, velocity: pending.velocity },
    });
  };

  const reset = () => {
    notes.forEach((entry) => {
      if (!entry.audioReleased) endVoice(entry);
      else if (entry.timer !== null) deps.clearTimer(entry.timer);
    });
    notes.clear();
  };

  return { press, release, reset };
}
