// The drum pad grid: pads 1-12 hold Library of Congress samples ("loc"),
// pads 13-16 hold drum kit samples ("kit").
export const PAD_COUNT = 16;
export const LOC_PAD_COUNT = 12;
export const KIT_PAD_COUNT = PAD_COUNT - LOC_PAD_COUNT;

// Pad numbers are 1-based
export function padId(n: number): string {
  return `pad-${n}`;
}

export function padNumber(id: string): number {
  return Number(id.slice("pad-".length));
}

export const ALL_PAD_IDS: readonly string[] = Array.from(
  { length: PAD_COUNT },
  (_, i) => padId(i + 1)
);
export const LOC_PAD_IDS = ALL_PAD_IDS.slice(0, LOC_PAD_COUNT);
export const KIT_PAD_IDS = ALL_PAD_IDS.slice(LOC_PAD_COUNT);

export const LOC_PAD_RANGE = `1–${LOC_PAD_COUNT}`;
export const KIT_PAD_RANGE = `${LOC_PAD_COUNT + 1}–${PAD_COUNT}`;
export const LOC_PADS_LABEL = `pads ${LOC_PAD_RANGE}`;
export const KIT_PADS_LABEL = `pads ${KIT_PAD_RANGE}`;

export const DEFAULT_SELECTED_PAD = padId(1);
