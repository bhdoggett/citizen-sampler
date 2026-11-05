import * as Tone from "tone";
import type { LoopName } from "src/types/audioTypes";
import type { LoopSettingsFE } from "src/types/audioTypesFE";
import type { Samples } from "src/lib/song/store";
import getScheduleEvents from "src/lib/audio/util/getScheduleEvents";
import { PPQ } from "src/lib/audio/util/timing";

const KIT_BASE_NOTE = 35; // pad N sounds at 35 + N, so pad 1 is 36
const DEFAULT_BASE_MIDI = 60;

export type MidiExportUnit = { kind: "kit" } | { kind: "pad"; padId: string };

export type BuildMidiFileInput = {
  samples: Samples;
  loop: LoopName;
  loopSettings: LoopSettingsFE;
  bpm: number;
  layout: "kit" | "multiOut";
  unit: MidiExportUnit;
  // Seconds, for hits that were recorded without a length
  fallbackDuration: (padId: string) => number;
};

type NoteMessage = { tick: number; on: boolean; channel: number; note: number; velocity: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function padNumber(padId: string): number | null {
  const match = /^pad-(\d+)$/.exec(padId);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= 16 ? n : null;
}

function toMidi(note: unknown, fallback: number): number {
  try {
    const midi = Tone.Frequency(note as Tone.Unit.Frequency).toMidi();
    return Number.isFinite(midi) ? Math.round(midi) : fallback;
  } catch {
    return fallback;
  }
}

// Same rule as swingOffsetSeconds in engine/core/src/Rules.cpp
function swingOffsetTicks(tick: number, swing: number): number {
  const progress = (((Math.round(tick) % PPQ) + PPQ) % PPQ) / PPQ;
  return (PPQ / 3) * Math.sin(progress * Math.PI) * swing;
}

function vlq(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >>> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  return bytes;
}

function chunk(tag: string, body: number[]): number[] {
  const length = body.length;
  return [
    ...Array.from(tag, (c) => c.charCodeAt(0)),
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...body,
  ];
}

const END_OF_TRACK = [0xff, 0x2f, 0x00];

function conductorTrack(bpm: number, beats: number): number[] {
  const micros = Math.round(60_000_000 / bpm);
  return chunk("MTrk", [
    0x00, 0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff,
    0x00, 0xff, 0x58, 0x04, beats, 2, 24, 8,
    0x00, ...END_OF_TRACK,
  ]);
}

function noteTrack(messages: NoteMessage[]): number[] {
  // Offs sort before ons so a repeated pitch is released before it is struck
  const sorted = [...messages].sort(
    (a, b) => a.tick - b.tick || Number(a.on) - Number(b.on),
  );
  const body: number[] = [];
  let last = 0;
  for (const m of sorted) {
    body.push(
      ...vlq(m.tick - last),
      (m.on ? 0x90 : 0x80) | (m.channel - 1),
      m.note,
      m.on ? m.velocity : 0,
    );
    last = m.tick;
  }
  body.push(...vlq(0), ...END_OF_TRACK);
  return chunk("MTrk", body);
}

function padMessages(
  input: BuildMidiFileInput,
  padId: string,
  number: number,
): { messages: NoteMessage[]; droppedPitch: boolean } {
  const pad = input.samples[padId];
  // The hits as the engine plays them: snapped to the pad's quantize grid,
  // wrapped at the loop end, with duplicates dropped (buildSchedule in
  // engine/core/src/Schedule.cpp)
  const timing = { ...input.loopSettings, bpm: input.bpm };
  const hits = pad ? getScheduleEvents(pad, input.loop, timing) : [];
  const multiOut = input.layout === "multiOut";
  const channel = multiOut ? number : 1;
  const baseMidi = multiOut
    ? toMidi(pad?.settings.baseNote, DEFAULT_BASE_MIDI)
    : DEFAULT_BASE_MIDI;
  const ticksPerSecond = (input.bpm / 60) * PPQ;
  const messages: NoteMessage[] = [];
  let droppedPitch = false;

  for (const [seconds, event] of hits) {
    const tick = seconds * ticksPerSecond;
    const eventMidi = toMidi(event.note, DEFAULT_BASE_MIDI);
    let note: number;
    if (multiOut) {
      note = eventMidi - (DEFAULT_BASE_MIDI - baseMidi);
    } else {
      note = KIT_BASE_NOTE + number;
      if (eventMidi !== DEFAULT_BASE_MIDI) droppedPitch = true;
    }
    // Swing moves the snapped time, as in Engine::runSegment
    const start = Math.round(tick + swingOffsetTicks(tick, input.loopSettings.swing));
    const duration = event.duration ?? input.fallbackDuration(padId);
    const length = Math.max(1, Math.round(duration * ticksPerSecond));
    const velocity = clamp(Math.round(event.velocity * 127), 1, 127);
    const clampedNote = clamp(note, 0, 127);
    messages.push(
      { tick: start, on: true, channel, note: clampedNote, velocity },
      { tick: start + length, on: false, channel, note: clampedNote, velocity: 0 },
    );
  }
  return { messages, droppedPitch };
}

export function buildMidiFile(
  input: BuildMidiFileInput,
): { bytes: Uint8Array; droppedPitch: boolean } | null {
  const pads = Object.keys(input.samples)
    .map((padId) => ({ padId, number: padNumber(padId) }))
    .filter((p): p is { padId: string; number: number } => p.number !== null)
    .filter((p) => input.unit.kind === "kit" || p.padId === input.unit.padId)
    .sort((a, b) => a.number - b.number);

  const perPad = pads
    .map((p) => padMessages(input, p.padId, p.number))
    .filter((p) => p.messages.length > 0);
  if (perPad.length === 0) return null;

  // Kit layout shares one channel, so it shares one track; multi-out gets a
  // track per pad so each one lands on its own channel's track in a DAW.
  const tracks =
    input.layout === "kit" ? [perPad.flatMap((p) => p.messages)] : perPad.map((p) => p.messages);

  const header = chunk("MThd", [0, 1, 0, tracks.length + 1, PPQ >> 8, PPQ & 0xff]);
  const bytes = Uint8Array.from([
    ...header,
    ...conductorTrack(input.bpm, input.loopSettings.beats),
    ...tracks.flatMap(noteTrack),
  ]);
  return { bytes, droppedPitch: perPad.some((p) => p.droppedPitch) };
}
