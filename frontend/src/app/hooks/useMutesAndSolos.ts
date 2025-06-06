"useClient";
import { useAudioContext } from "../contexts/AudioContext";
import { SampleTypeFE } from "src/types/audioTypesFE";

const useMutesAndSolos = () => {
  const { allSampleData, setAllSampleData, solosExist } = useAudioContext();

  // simplify soloed samples state updates
  const setSampleSolo = (id: string, value: boolean) => {
    setAllSampleData((prev: Record<string, SampleTypeFE>) => {
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

  // simplify muted samples state updates
  const setSampleMute = (id: string, value: boolean) => {
    setAllSampleData((prev: Record<string, SampleTypeFE>) => {
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

  // remove solo from all samples
  const clearSolos = () => {
    Object.keys(allSampleData).forEach((id) => {
      setSampleSolo(id, false);
    });
  };

  return {
    setSampleMute,
    setSampleSolo,
    clearSolos,
    solosExist,
  };
};

export default useMutesAndSolos;
