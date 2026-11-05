import { describe, expect, it } from "vitest";
import { buildMidiFile } from "./buildMidiFile";
import type { Samples } from "src/lib/song/store";
import type { LoopSettingsFE, SampleEventFE } from "src/types/audioTypesFE";

type Parsed = {
  format: number;
  division: number;
  tracks: {
    tempo: number[];
    timeSig: number[][];
    notes: { tick: number; kind: "on" | "off"; ch: number; note: number; vel: number }[];
  }[];
};

function readSmf(bytes: Uint8Array): Parsed {
  let p = 0;
  const u32 = () => ((bytes[p++] << 24) | (bytes[p++] << 16) | (bytes[p++] << 8) | bytes[p++]) >>> 0;
  const u16 = () => (bytes[p++] << 8) | bytes[p++];
  const vlq = () => {
    let v = 0;
    let b: number;
    do {
      b = bytes[p++];
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };
  const tag = () => String.fromCharCode(bytes[p++], bytes[p++], bytes[p++], bytes[p++]);
  expect(tag()).toBe("MThd");
  expect(u32()).toBe(6);
  const format = u16();
  const count = u16();
  const division = u16();
  const tracks: Parsed["tracks"] = [];
  for (let t = 0; t < count; t++) {
    expect(tag()).toBe("MTrk");
    const end = u32() + p;
    const track: Parsed["tracks"][number] = { tempo: [], timeSig: [], notes: [] };
    let tick = 0;
    let status = 0;
    while (p < end) {
      tick += vlq();
      let s = bytes[p];
      if (s & 0x80) p++;
      else s = status;
      if (s === 0xff) {
        const type = bytes[p++];
        const len = vlq();
        const data = Array.from(bytes.slice(p, p + len));
        p += len;
        if (type === 0x51) track.tempo.push((data[0] << 16) | (data[1] << 8) | data[2]);
        if (type === 0x58) track.timeSig.push(data);
      } else {
        status = s;
        const ch = (s & 0x0f) + 1;
        const n = bytes[p++];
        const v = bytes[p++];
        const high = s & 0xf0;
        if (high === 0x90 && v > 0) track.notes.push({ tick, kind: "on", ch, note: n, vel: v });
        else if (high === 0x80 || high === 0x90)
          track.notes.push({ tick, kind: "off", ch, note: n, vel: v });
      }
    }
    tracks.push(track);
  }
  return { format, division, tracks };
}

const loopSettings: LoopSettingsFE = { beats: 4, bars: 1, bpm: 120, swing: 0, isInitialized: true };
const ev = (over: Partial<SampleEventFE>): SampleEventFE => ({
  startTime: 0,
  duration: 0.25,
  note: "C4",
  velocity: 1,
  ...over,
});
const makeSamples = (
  pads: Record<string, { events: SampleEventFE[]; baseNote?: string; quantVal?: string }>,
): Samples =>
  Object.fromEntries(
    Object.entries(pads).map(([id, p]) => [
      id,
      {
        url: "",
        events: { A: p.events, B: [], C: [], D: [] },
        settings: {
          baseNote: p.baseNote ?? "C4",
          quantize: p.quantVal !== undefined,
          quantVal: p.quantVal ?? "16",
        },
      },
    ]),
  ) as unknown as Samples;

const build = (
  samples: Samples,
  over: Partial<Parameters<typeof buildMidiFile>[0]> = {},
) =>
  buildMidiFile({
    samples,
    loop: "A",
    loopSettings,
    bpm: 120,
    layout: "kit",
    unit: { kind: "kit" },
    fallbackDuration: () => 0.5,
    ...over,
  });

const notesOf = (r: NonNullable<ReturnType<typeof build>>) =>
  readSmf(r.bytes).tracks.flatMap((t) => t.notes);

describe("buildMidiFile", () => {
  it("exports a kit hit at the kit note on channel 1", () => {
    const r = build(makeSamples({ "pad-1": { events: [ev({})] } }))!;
    const smf = readSmf(r.bytes);
    expect(smf.format).toBe(1);
    expect(smf.division).toBe(192);
    const notes = notesOf(r);
    expect(notes).toEqual([
      { tick: 0, kind: "on", ch: 1, note: 36, vel: 127 },
      { tick: 96, kind: "off", ch: 1, note: 36, vel: 0 },
    ]);
    expect(r.droppedPitch).toBe(false);
  });

  it("flattens pitched events in kit layout and reports it", () => {
    const r = build(makeSamples({ "pad-1": { events: [ev({ note: "D4" })] } }))!;
    expect(notesOf(r)[0]).toMatchObject({ note: 36, ch: 1 });
    expect(r.droppedPitch).toBe(true);
  });

  it("maps multi-out pads to their channel with the base note undone", () => {
    const r = build(makeSamples({ "pad-3": { events: [ev({})], baseNote: "A3" } }), {
      layout: "multiOut",
      unit: { kind: "pad", padId: "pad-3" },
    })!;
    expect(notesOf(r)[0]).toMatchObject({ ch: 3, note: 57 });
    expect(r.droppedPitch).toBe(false);
  });

  it("writes one track per pad for a multi-out kit export", () => {
    const r = build(
      makeSamples({
        "pad-1": { events: [ev({})] },
        "pad-2": { events: [ev({})] },
        "pad-4": { events: [] },
      }),
      { layout: "multiOut" },
    )!;
    const noteTracks = readSmf(r.bytes).tracks.filter((t) => t.notes.length > 0);
    expect(noteTracks.map((t) => t.notes[0].ch)).toEqual([1, 2]);
  });

  it("only exports the requested pad", () => {
    const r = build(
      makeSamples({ "pad-1": { events: [ev({})] }, "pad-2": { events: [ev({})] } }),
      { unit: { kind: "pad", padId: "pad-2" } },
    )!;
    expect(notesOf(r).every((n) => n.note === 37)).toBe(true);
  });

  it("applies swing to off-beat events", () => {
    const r = build(
      makeSamples({ "pad-1": { events: [ev({ startTime: 96 })] } }),
      { loopSettings: { ...loopSettings, swing: 0.5 } },
    )!;
    expect(notesOf(r)[0].tick).toBe(128);
  });

  it("adds no swing offset for a negative swing", () => {
    const r = build(
      makeSamples({ "pad-1": { events: [ev({ startTime: 96 })] } }),
      { loopSettings: { ...loopSettings, swing: -0.5 } },
    )!;
    expect(notesOf(r)[0].tick).toBe(96);
  });

  // The engine snaps hits when it plays them (buildSchedule in
  // engine/core/src/Schedule.cpp), so the file must hold the same times
  it("snaps hits to the pad's quantize grid", () => {
    const r = build(makeSamples({ "pad-1": { events: [ev({ startTime: 100 })], quantVal: "4" } }))!;
    expect(notesOf(r)[0]).toMatchObject({ tick: 192, kind: "on" });
  });

  it("leaves hits where they are with quantize off", () => {
    const r = build(makeSamples({ "pad-1": { events: [ev({ startTime: 100 })] } }))!;
    expect(notesOf(r)[0]).toMatchObject({ tick: 100, kind: "on" });
  });

  it("snaps triplet grids like the engine", () => {
    // An eighth-note triplet is 64 ticks
    const r = build(makeSamples({ "pad-1": { events: [ev({ startTime: 100 })], quantVal: "8t" } }))!;
    expect(notesOf(r)[0]).toMatchObject({ tick: 128, kind: "on" });
  });

  it("plays a hit snapped onto the loop end at the start", () => {
    // One 4/4 bar is 768 ticks; a whole-note grid snaps 700 to 768
    const r = build(makeSamples({ "pad-1": { events: [ev({ startTime: 700 })], quantVal: "1" } }))!;
    expect(notesOf(r)[0]).toMatchObject({ tick: 0, kind: "on" });
  });

  it("drops hits past the loop end", () => {
    const r = build(
      makeSamples({ "pad-1": { events: [ev({ startTime: 800 }), ev({ startTime: 96 })] } }),
    )!;
    expect(notesOf(r).filter((n) => n.kind === "on").map((n) => n.tick)).toEqual([96]);
  });

  it("drops a hit that lands on another with the same note", () => {
    const r = build(
      makeSamples({
        "pad-1": { events: [ev({ startTime: 0 }), ev({ startTime: 20 })], quantVal: "4" },
      }),
    )!;
    expect(notesOf(r).filter((n) => n.kind === "on")).toHaveLength(1);
  });

  it("keeps hits at the same time with different notes", () => {
    const r = build(
      makeSamples({ "pad-1": { events: [ev({}), ev({ note: "D4" })] } }),
      { layout: "multiOut" },
    )!;
    expect(notesOf(r).filter((n) => n.kind === "on").map((n) => n.note)).toEqual([60, 62]);
  });

  it("swings a hit after snapping it", () => {
    // 90 snaps to the eighth at 96, which a 0.5 swing moves to 128
    const r = build(
      makeSamples({ "pad-1": { events: [ev({ startTime: 90 })], quantVal: "8" } }),
      { loopSettings: { ...loopSettings, swing: 0.5 } },
    )!;
    expect(notesOf(r)[0].tick).toBe(128);
  });

  it("returns null for an empty loop", () => {
    expect(build(makeSamples({ "pad-1": { events: [] } }))).toBeNull();
  });

  it("skips events without a start time and uses the fallback duration", () => {
    const r = build(
      makeSamples({
        "pad-1": { events: [ev({ startTime: null }), ev({ duration: null })] },
      }),
    )!;
    expect(notesOf(r)).toHaveLength(2);
    expect(notesOf(r)[1].tick).toBe(192);
  });

  it("puts a note-off before a note-on at the same tick", () => {
    const r = build(
      makeSamples({
        "pad-1": { events: [ev({}), ev({ startTime: 96 })] },
      }),
    )!;
    const at96 = notesOf(r).filter((n) => n.tick === 96);
    expect(at96.map((n) => n.kind)).toEqual(["off", "on"]);
  });

  it("encodes tempo and time signature", () => {
    const r = build(makeSamples({ "pad-1": { events: [ev({})] } }))!;
    const smf = readSmf(r.bytes);
    expect(smf.tracks[0].tempo).toEqual([500000]);
    expect(smf.tracks[0].timeSig).toEqual([[4, 2, 24, 8]]);
  });
});
