import * as Tone from "tone";
import { CustomSampler } from "./CustomSampler";
import type { SamplerWithFX } from "./SamplerWithFX";

// Build one pad's sampler and FX chain and resolve once its sample has
// loaded. `output` is the master bus for live play, or the offline
// destination when rendering stems.
export function createVoice(
  padId: string,
  url: string,
  output: Tone.InputNode,
): Promise<SamplerWithFX> {
  return new Promise((resolve, reject) => {
    const gain = new Tone.Gain(1); // Mute and solo only
    const pitch = new Tone.PitchShift(0);
    const panVol = new Tone.PanVol(0, 0);
    const highpass = new Tone.Filter(0, "highpass");
    const lowpass = new Tone.Filter(20000, "lowpass");
    const analyser = new Tone.Analyser("fft", 4096);

    const disposeChain = () => {
      [gain, pitch, panVol, highpass, lowpass, analyser].forEach((node) =>
        node.dispose(),
      );
    };

    const sampler = new CustomSampler({
      urls: { C4: url },
      onload: () => {
        sampler.connect(gain);
        gain.connect(pitch);
        // Tap before the pitch shifter to avoid its phase-vocoder latency
        gain.connect(analyser);
        pitch.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(panVol);
        panVol.connect(output);
        resolve({
          id: padId,
          sampler,
          pitch,
          gain,
          panVol,
          highpass,
          lowpass,
          analyser,
        });
      },
      onerror: (error) => {
        sampler.dispose();
        disposeChain();
        reject(error);
      },
    });
  });
}

export function disposeVoice(voice: SamplerWithFX): void {
  const { sampler, gain, pitch, panVol, highpass, lowpass, analyser } = voice;
  [sampler, gain, pitch, panVol, highpass, lowpass, analyser].forEach((node) =>
    node.dispose(),
  );
}
