import { beforeEach, describe, expect, it } from "vitest";
import { createLiveInput, type LiveInputDeps } from "./liveInput";
import type { EngineEvent } from "./protocol";
import type { LoopName } from "src/types/audioTypes";

// 120 bpm, 4 beats, 2 bars: a 4 s loop of 1536 ticks
const TIMING = { bpm: 120, beats: 4, bars: 2 };

type Harness = {
  deps: LiveInputDeps;
  events: EngineEvent[];
  attacks: string[];
  releases: string[];
  timers: Map<number, () => void>;
  set: (patch: Partial<State>) => void;
  fireTimers: () => void;
};

type State = {
  recording: boolean;
  ticks: number;
  seconds: number;
  loop: LoopName;
  oneShot: boolean;
  end: number | null;
  soundMs: number | null;
};

function harness(): Harness {
  const state: State = {
    recording: true,
    ticks: 0,
    seconds: 0,
    loop: "A",
    oneShot: false,
    end: null,
    soundMs: 500,
  };
  const events: EngineEvent[] = [];
  const attacks: string[] = [];
  const releases: string[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 1;

  const deps: LiveInputDeps = {
    attack: (padId, note) => {
      if (state.soundMs === null) return null;
      attacks.push(`${padId}:${note}`);
      return state.soundMs;
    },
    releaseVoice: (padId, note) => releases.push(`${padId}:${note}`),
    padSettings: () => ({ oneShot: state.oneShot, end: state.end }),
    recordingPosition: () =>
      state.recording ? { loop: state.loop, ticks: state.ticks } : null,
    isRecording: () => state.recording,
    transportSeconds: () => state.seconds,
    loopTiming: () => TIMING,
    emit: (event) => events.push(event),
    setTimer: (fn) => {
      const id = nextTimer++;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (id) => {
      timers.delete(id as number);
    },
  };

  return {
    deps,
    events,
    attacks,
    releases,
    timers,
    set: (patch) => Object.assign(state, patch),
    fireTimers: () => {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((fn) => fn());
    },
  };
}

const hits = (events: EngineEvent[]) =>
  events.filter((e) => e.type === "hitRecorded");

describe("live input", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it("records one hit per press with the duration measured at release", () => {
    const input = createLiveInput(h.deps);
    h.set({ ticks: 384, seconds: 1 });
    input.press("pad-1", "C4", 1);
    h.set({ seconds: 1.25 });
    input.release("pad-1", "C4");

    expect(hits(h.events)).toEqual([
      {
        type: "hitRecorded",
        padId: "pad-1",
        loop: "A",
        event: { startTime: 384, duration: 0.25, note: "C4", velocity: 1 },
      },
    ]);
    expect(h.releases).toEqual(["pad-1:C4"]);
  });

  it("still records a hit after the sound stopped on its own", () => {
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    h.fireTimers();
    h.set({ seconds: 2 });
    input.release("pad-1", "C4");

    expect(hits(h.events)).toHaveLength(1);
    // The voice was released once, by the timer, not again on key up
    expect(h.releases).toEqual(["pad-1:C4"]);
  });

  it("lets one-shot pads ring on but still records the hit", () => {
    h.set({ oneShot: true });
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    h.set({ seconds: 0.1 });
    input.release("pad-1", "C4");

    expect(h.releases).toEqual([]);
    expect(hits(h.events)).toHaveLength(1);
  });

  it("records nothing when not recording", () => {
    h.set({ recording: false });
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    expect(hits(h.events)).toEqual([]);
    expect(h.attacks).toEqual(["pad-1:C4"]);
  });

  it("drops the hit when recording stops before release", () => {
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    h.set({ recording: false });
    input.release("pad-1", "C4");
    expect(hits(h.events)).toEqual([]);
  });

  it("ignores a release without a press", () => {
    const input = createLiveInput(h.deps);
    input.release("pad-1", "C4");
    expect(h.events).toEqual([]);
    expect(h.releases).toEqual([]);
  });

  it("holds several notes on one pad independently", () => {
    const input = createLiveInput(h.deps);
    h.set({ ticks: 0 });
    input.press("pad-1", "C4", 1);
    h.set({ ticks: 192 });
    input.press("pad-1", "E4", 0.5);
    h.set({ seconds: 1 });
    input.release("pad-1", "E4");
    input.release("pad-1", "C4");

    const recorded = hits(h.events).map((e) =>
      e.type === "hitRecorded" ? [e.event.note, e.event.startTime, e.event.velocity] : null,
    );
    expect(recorded).toEqual([
      ["E4", 192, 0.5],
      ["C4", 0, 1],
    ]);
  });

  it("records a quick tap as a short hit, not a whole loop", () => {
    const input = createLiveInput(h.deps);
    // The tick count can round past the seconds clock at press time
    h.set({ ticks: 384, seconds: 0.999 });
    input.press("pad-1", "C4", 1);
    h.set({ seconds: 1.0 });
    input.release("pad-1", "C4");
    const [hit] = hits(h.events);
    expect(hit.type === "hitRecorded" && hit.event.duration).toBeCloseTo(0.001);
  });

  it("measures a hit held across the loop end", () => {
    const input = createLiveInput(h.deps);
    h.set({ ticks: 1440, seconds: 3.75 });
    input.press("pad-1", "C4", 1);
    h.set({ seconds: 0.25 });
    input.release("pad-1", "C4");
    const [hit] = hits(h.events);
    expect(hit.type === "hitRecorded" && hit.event.duration).toBeCloseTo(0.5);
  });

  it("folds a start read just past the loop end back to the top", () => {
    const input = createLiveInput(h.deps);
    h.set({ ticks: 1536 + 10, seconds: 0.2 });
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    const [hit] = hits(h.events);
    expect(hit.type === "hitRecorded" && hit.event.startTime).toBe(10);
  });

  it("reports the voice start and end", () => {
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    const voice = h.events.filter((e) => e.type !== "hitRecorded");
    expect(voice).toEqual([
      { type: "voiceStarted", padId: "pad-1", note: "C4" },
      { type: "voiceEnded", padId: "pad-1", note: "C4" },
    ]);
  });

  it("ends a one-shot voice when its timer fires", () => {
    h.set({ oneShot: true });
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    expect(h.events.some((e) => e.type === "voiceEnded")).toBe(false);
    h.fireTimers();
    expect(h.events.at(-1)).toEqual({ type: "voiceEnded", padId: "pad-1", note: "C4" });
    expect(h.releases).toEqual(["pad-1:C4"]);
  });

  it("restarts a held note and replaces its pending hit", () => {
    const input = createLiveInput(h.deps);
    h.set({ ticks: 0 });
    input.press("pad-1", "C4", 1);
    h.set({ ticks: 384 });
    input.press("pad-1", "C4", 1);
    expect(h.timers.size).toBe(1);
    h.set({ seconds: 1.5 });
    input.release("pad-1", "C4");
    const recorded = hits(h.events);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].type === "hitRecorded" && recorded[0].event.startTime).toBe(384);
  });

  it("does nothing for a pad with no sound loaded", () => {
    h.set({ soundMs: null });
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    input.release("pad-1", "C4");
    expect(h.events).toEqual([]);
  });

  it("releases every held voice on reset", () => {
    const input = createLiveInput(h.deps);
    input.press("pad-1", "C4", 1);
    input.press("pad-2", "C4", 1);
    input.reset();
    expect(h.releases.sort()).toEqual(["pad-1:C4", "pad-2:C4"]);
    expect(h.timers.size).toBe(0);
    input.release("pad-1", "C4");
    expect(hits(h.events)).toEqual([]);
  });
});
