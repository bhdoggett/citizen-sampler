import { describe, expect, it, vi } from "vitest";
import type { SamplerWithFX } from "src/types/SamplerWithFX";
import type { SampleSettingsFE } from "src/types/audioTypesFE";
import { applySoundSettings } from "./applySoundSettings";

// Plain-object stand-in for the Tone nodes: each param is a { value } holder.
const makeFakeSampler = () => ({
  sampler: { attack: -1, release: -1, setReverse: vi.fn() },
  gain: { gain: { value: 0.5 } },
  pitch: { pitch: -1 },
  panVol: { volume: { value: -1 }, pan: { value: -1 } },
  highpass: { frequency: { value: -1 } },
  lowpass: { frequency: { value: -1 } },
});

const asSampler = (fake: ReturnType<typeof makeFakeSampler>) =>
  fake as unknown as SamplerWithFX;

const settings = (overrides: Partial<SampleSettingsFE> = {}) =>
  ({
    attack: 0.1,
    release: 0.2,
    reverse: true,
    pitch: 0.3,
    volume: -6,
    pan: -0.5,
    highpass: [120, "highpass"],
    lowpass: [8000, "lowpass"],
    mute: false,
    solo: false,
    ...overrides,
  }) as SampleSettingsFE;

describe("applySoundSettings", () => {
  it("sets every sound parameter from the settings", () => {
    const fake = makeFakeSampler();
    applySoundSettings(asSampler(fake), settings());

    expect(fake.sampler.attack).toBe(0.1);
    expect(fake.sampler.release).toBe(0.2);
    expect(fake.sampler.setReverse).toHaveBeenCalledWith(true);
    expect(fake.pitch.pitch).toBe(0.3);
    expect(fake.panVol.volume.value).toBe(-6);
    expect(fake.panVol.pan.value).toBe(-0.5);
    expect(fake.highpass.frequency.value).toBe(120);
    expect(fake.lowpass.frequency.value).toBe(8000);
  });

  it("keeps a lowpass of 0 Hz instead of replacing it", () => {
    const fake = makeFakeSampler();
    applySoundSettings(asSampler(fake), settings({ lowpass: [0, "lowpass"] }));
    expect(fake.lowpass.frequency.value).toBe(0);
  });

  it("opens the lowpass fully when saved data has no value", () => {
    const fake = makeFakeSampler();
    applySoundSettings(
      asSampler(fake),
      settings({ lowpass: undefined as unknown as SampleSettingsFE["lowpass"] })
    );
    expect(fake.lowpass.frequency.value).toBe(20000);
  });

  it("defaults missing numeric settings to 0", () => {
    const fake = makeFakeSampler();
    applySoundSettings(
      asSampler(fake),
      { mute: false, solo: false } as unknown as SampleSettingsFE
    );
    expect(fake.sampler.attack).toBe(0);
    expect(fake.panVol.volume.value).toBe(0);
    expect(fake.highpass.frequency.value).toBe(0);
    expect(fake.sampler.setReverse).toHaveBeenCalledWith(false);
  });

  it("leaves the mute/solo gain alone", () => {
    const fake = makeFakeSampler();
    applySoundSettings(asSampler(fake), settings({ mute: true }));
    expect(fake.gain.gain.value).toBe(0.5);
  });
});
