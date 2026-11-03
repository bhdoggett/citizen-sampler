import type { SamplerWithFX } from "./SamplerWithFX";
import type { SampleSettingsFE } from "src/types/audioTypesFE";

// Push a pad's sound settings onto its sampler and FX chain. Mute/solo gain
// is not set here: it depends on every pad's solo state (see computeGain).
// Fallbacks use ?? so a saved 0 stays 0; an unset lowpass is fully open.
export function applySoundSettings(
  samplerWithFX: SamplerWithFX,
  settings: SampleSettingsFE
): void {
  const { sampler, pitch, panVol, highpass, lowpass } = samplerWithFX;
  sampler.attack = settings.attack ?? 0;
  sampler.release = settings.release ?? 0;
  sampler.setReverse(settings.reverse ?? false);
  pitch.pitch = settings.pitch ?? 0;
  panVol.volume.value = settings.volume ?? 0;
  panVol.pan.value = settings.pan ?? 0;
  highpass.frequency.value = settings.highpass?.[0] ?? 0;
  lowpass.frequency.value = settings.lowpass?.[0] ?? 20000;
}
