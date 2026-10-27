import type { SampleSettingsFE } from "src/types/audioTypesFE";

/**
 * The full settings to push onto the selected pad's sampler, or null to skip.
 * Skips while the settings panel still holds another pad's values, which
 * happens for one render right after the selection changes.
 */
export function resolveSyncSettings(
  selectedSampleId: string,
  settingsPadId: string | null,
  localSettings: Partial<SampleSettingsFE> | null,
  savedSettings: SampleSettingsFE | undefined
): SampleSettingsFE | null {
  if (!localSettings || !savedSettings) return null;
  if (settingsPadId !== selectedSampleId) return null;
  return { ...savedSettings, ...localSettings };
}
