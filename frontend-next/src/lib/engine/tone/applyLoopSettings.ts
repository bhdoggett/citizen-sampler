import type * as Tone from "tone";
import type { LoopSettingsFE } from "src/types/audioTypesFE";

// The transport fields a loop controls. Both the live transport and the
// Tone.Offline transport used for stems satisfy this shape.
export type TransportLike = {
  bpm: { value: number };
  swing: number;
  timeSignature: number | number[];
  loop: boolean;
  loopStart: Tone.Unit.Time;
  loopEnd: Tone.Unit.Time;
};

export function applyLoopSettings(
  transport: TransportLike,
  settings: LoopSettingsFE
): void {
  transport.bpm.value = settings.bpm;
  transport.swing = settings.swing;
  transport.timeSignature = settings.beats;
  transport.loop = true;
  transport.loopStart = "0:0:0";
  transport.loopEnd = `${settings.bars}:0:0`;
}
