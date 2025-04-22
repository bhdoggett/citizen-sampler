"useClient";
import { useEffect, useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import type { SamplerWithFX, SampleType } from "../types/SampleTypes";

const useMutesAndSolos = () => {
  const { samplersRef, allSampleData, setAllSampleData } = useAudioContext();
  const [solosExist, setSolosExist] = useState<boolean>(false);

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

  const clearSolos = () => {
    Object.keys(allSampleData).forEach((id) => {
      setSampleSolo(id, false);
    });
  };

  useEffect(() => {
    const solosExist = Object.values(allSampleData).some(
      (sample) => sample.settings.solo
    );
    setSolosExist(solosExist);
  }, [allSampleData]);

  return {
    setSampleMute,
    setSampleSolo,
    clearSolos,
    solosExist,
  };
};

export default useMutesAndSolos;
