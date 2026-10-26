import type { SampleTypeFE } from "src/types/audioTypesFE";

type MuteSolo = { mute: boolean; solo: boolean };

// Mute and solo are mutually exclusive, so a pad is silent when it is muted
// or when another pad is soloed and this one isn't.
export function computeGain(settings: MuteSolo, solosExist: boolean): 0 | 1 {
  if (settings.mute) return 0;
  if (solosExist && !settings.solo) return 0;
  return 1;
}

// Saved songs from before mute and solo were exclusive can have both on.
// Solo wins, so the pad keeps playing.
export function normalizeMuteSolo<T extends MuteSolo>(settings: T): T {
  return settings.mute && settings.solo ? { ...settings, mute: false } : settings;
}

export function normalizeAllMuteSolo(
  data: Record<string, SampleTypeFE>
): Record<string, SampleTypeFE> {
  return Object.fromEntries(
    Object.entries(data).map(([id, sample]) => {
      const settings = normalizeMuteSolo(sample.settings);
      return [id, settings === sample.settings ? sample : { ...sample, settings }];
    })
  );
}
