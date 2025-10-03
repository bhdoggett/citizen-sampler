
import { useState } from "react";
import { useAudioContext } from "../../contexts/AudioContext";
import { useUIContext } from "../../contexts/UIContext";
import {
  DrumMachineId,
  drumMachines,
  getDrumMachineKeyByName,
} from "../../lib/drumMachines";

const KitMenu: React.FC = () => {
  const {
    initKitSamples,
    loadSamplersToRef,
    setAllSampleData,
    storeAudioInIndexedDB,
  } = useAudioContext();
  const { confirmActionRef, setShowDialog, setHotKeysActive } = useUIContext();
  const drumMachineNames: string[] = Object.values(drumMachines).map(
    (drumMachine) => drumMachine.name
  );
  const drumMachineIds = Object.keys(drumMachines) as DrumMachineId[];
  const [id, setId] = useState<DrumMachineId>(
    drumMachineIds[0] as DrumMachineId
  );

  const handleChooseDrumMachine = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const drumMachineId = getDrumMachineKeyByName(e.target.value);
    if (drumMachineId) {
      setId(drumMachineId as DrumMachineId);
    }
  };

  const handleSelect = async (id: DrumMachineId) => {
    const newSamples = initKitSamples(id);

    setAllSampleData((prev) => {
      // Filter out all keys that start with "loc-"
      const filteredPrev = Object.fromEntries(
        Object.entries(prev).filter(([, sample]) => sample.type !== "kit")
      );

      // Merge in new loc samples
      return {
        ...filteredPrev,
        ...newSamples,
      };
    });

    await loadSamplersToRef(newSamples);
    // Store all new samples in IndexedDB
    for (const [sampleId, sample] of Object.entries(newSamples)) {
      await storeAudioInIndexedDB(sample.url, sampleId);
    }
    setShowDialog(null);
    setHotKeysActive(true);
  };

  return (
    <>
      <div className="flex flex-col w-full max-w-sm mx-auto">
        <label htmlFor="collection" className="text-white mb-1">
          Choose a Drum Machine:
        </label>
        <select
          name="drum-machine"
          id="drum-machine"
          onChange={handleChooseDrumMachine}
          className="shadow-inner text-black shadow-slate-700 w-full"
        >
          {drumMachineNames.map((drumMachine) => (
            <option
              key={drumMachine}
              value={drumMachine}
              className="w-full text-ellipsis"
            >
              {drumMachine}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          // e.preventDefault();
          confirmActionRef.current = {
            message:
              "This will replace pads 13-16 with new kit samples. Are you sure?",
            buttonText: "You Betcha",
            action: () => handleSelect(id),
          };
          setShowDialog("confirm-action");
        }}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        Load Samples
      </button>
    </>
  );
};

export default KitMenu;
