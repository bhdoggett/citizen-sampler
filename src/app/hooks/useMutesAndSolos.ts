import { useAudioContext } from "../contexts/AudioContext";
import type { SamplerWithFX } from "../types/SampleTypes";

const useMutesAndSolos = () => {
  const { samplersRef, allSampleData } = useAudioContext();

  const soloSampler = (id: string) => {
    Object.keys(samplersRef.current).forEach((key) => {
      if (key !== id) {
        samplersRef.current[key].gain.value = 0;
        allSampleData[key].settings.muted = true;
      }
    });
  };

  const unSoloSampler = () => {
    Object.keys(samplersRef.current).forEach((key) => {
      samplersRef.current[key].gain.value = 1;
    });
  };

  const muteSampler = (id: string) => {
    const sampler = samplersRef.current[id];
    if (sampler) {
      sampler.gain.value = 0;
    }
  };

  const unMuteSampler = (id: string) => {
    const sampler = samplersRef.current[id];
    if (sampler) {
      sampler.gain.value = 1;
    }
  };

  return {
    soloSampler,
    unSoloSampler,
    muteSampler,
    unMuteSampler,
  };
};

export default useMutesAndSolos;
