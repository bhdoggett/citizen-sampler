import { useAudioContext } from "../contexts/AudioContext";
import type { SamplerWithFX, SampleType } from "../types/SampleTypes";

const useMutesAndSolos = () => {
  const { samplersRef, allSampleData, setAllSampleData } = useAudioContext();

  // simplify gain adjustments in mute and solo functions below

  // simplify state updates in solo functions below
  const setSampleSolo = (id: string, value: boolean) => {
    setAllSampleData((prev: Record<string, SampleType>) => {
      return {
        ...prev,
        [id]: {
          ...prev[id],
          settings: {
            ...prev[id].settings,
            solo: value,
          },
        },
      };
    });
  };

  // simplify state updates in mute functions below
  const setSampleMute = (id: string, value: boolean) => {
    setAllSampleData((prev: Record<string, SampleType>) => {
      return {
        ...prev,
        [id]: {
          ...prev[id],
          settings: {
            ...prev[id].settings,
            mute: value,
          },
        },
      };
    });
  };

  const muteSampler = (id: string) => {
    const sampler = samplersRef.current[id];
    if (sampler) {
      setGain(id, 0);
      setSampleMute(id, true);
    }
  };

  // if a sample is unmuted but another sample is soloed, the gain should not yet be set back to 1.
  // this function will be called when a sample is unmuted and will set the gain back to 1 if the sample is not soloed.

  // in the case that a sampler somewhere is soloed, all the samplers that are not muted will be restored to 1 gain when that sampler is unsoloed. all samplers that have a "muted = true" state when the soloed sample is unsoleoed should remain muted.

  const unMuteSampler = (id: string) => {
    const sampler = samplersRef.current[id];
    const noSoloedSamples = Object.values(allSampleData).every(
      (sample) => !sample.settings.solo
    );

    if (sampler && noSoloedSamples) {
      sampler.gain.value = 1;
    }
  };

  const soloSampler = (id: string) => {
    Object.keys(samplersRef.current).forEach((key) => {
      if (key !== id && !allSampleData[id].settings.solo) {
        setGain(id, 0);
      } else {
        setSampleSolo(id, true);
      }
    });
  };

  const unSoloSampler = (id: string) => {
    Object.keys(samplersRef.current).forEach((id) => {
      if (!allSampleData[id].settings.muted) {
        setGain(id, 1);
      }
      setSampleSolo(id, false);
    });
  };

  return {
    setSampleMute,
    setSampleSolo,
  };
};

export default useMutesAndSolos;
