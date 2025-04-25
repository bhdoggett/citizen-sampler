import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import type { SamplerWithFX } from "../types/SampleTypes";

const useMakeSampler = () => {
  const context = useAudioContext();

  if (!context) {
    throw new Error("useMakeSampler must be used within an <AudioProvider>");
  }

  const { masterGainNode } = context;

  const makeSampler = (sampleId: string, sampleUrl: string): SamplerWithFX => {
    const sampler = new Tone.Sampler({
      urls: { C4: sampleUrl },
    });

    const gain = new Tone.Gain(1);
    const panVol = new Tone.PanVol(0, 0);
    const highpass = new Tone.Filter(0, "highpass");
    const lowpass = new Tone.Filter(20000, "lowpass");

    sampler.connect(gain);
    gain.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(panVol);
    panVol.connect(masterGainNode.current).toDestination();

    return {
      id: sampleId,
      sampler,
      gain,
      panVol,
      highpass,
      lowpass,
      currentEvent: { startTime: null, duration: null },
    };
  };

  return makeSampler;
};

export default useMakeSampler;
