"use client";
import { useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
// import { collectionNames } from "../../lib/loc_collections";
import { useUIContext } from "frontend/src/app/contexts/UIContext";
import {
  DrumMachineId,
  drumMachines,
  getDrumMachineKeyByName,
} from "frontend/src/lib/drumMachines";

type KitMenuProps = {
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const KitMenu: React.FC<KitMenuProps> = () => {
  const {
    initKitSamples,
    cleanupSampler,
    setAllSampleData,
    samplersRef,
    makeSamplerWithFX,
  } = useAudioContext();
  const drumMachineNames: string[] = Object.values(drumMachines).map(
    (drumMachine) => drumMachine.name
  );
  const drumMachineIds = Object.keys(drumMachines) as DrumMachineId[];
  const { confirmActionRef, setShowDialog } = useUIContext();
  const [id, setId] = useState<DrumMachineId>(
    drumMachineIds[0] as DrumMachineId
  );

  const handleChooseDrumMachine = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const drumMachineId = getDrumMachineKeyByName(e.target.value);
    if (drumMachineId) {
      setId(drumMachineId as DrumMachineId);
    }
  };

  const handleSelect = (id: DrumMachineId) => {
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

    Object.entries(newSamples).forEach(async ([key, sample]) => {
      cleanupSampler(key, samplersRef);
      samplersRef.current[key] = await makeSamplerWithFX(sample.id, sample.url);
    });
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
