// Tempo and length of one loop. LoopSettingsFE satisfies this shape.
export type LoopTiming = { bpm: number; beats: number; bars: number };

// Ticks per quarter note. Tone's default, which the app never changes.
export const PPQ = 192;

export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / PPQ) * (60 / bpm);
}

export function loopDurationSeconds({ bpm, beats, bars }: LoopTiming): number {
  return bars * beats * (60 / bpm);
}
