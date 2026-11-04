"use client";
import { useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";
import OptionList from "./OptionList";
import { DrumMachineId, drumMachines } from "src/lib/drumMachines";
import { KIT_PADS_LABEL } from "src/lib/constants/padLayout";

const KitMenu: React.FC = () => {
  const {
    initKitSamples,
    setAllSampleData,
  } = useAudioContext();
  const { openDialog, closeDialog } = useUIContext();
  const drumMachineNames: string[] = Object.values(drumMachines).map(
    (drumMachine) => drumMachine.name
  );
  const drumMachineIds = Object.keys(drumMachines) as DrumMachineId[];
  const [id, setId] = useState<DrumMachineId>(
    drumMachineIds[0] as DrumMachineId
  );

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

    // The engine loads the new samples as it follows the store
    closeDialog();
  };

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <span className={styles.label}>
          Drum Machine
        </span>
        <OptionList
          name="drum-machine"
          label="Drum machine"
          items={drumMachineNames}
          selectedIndex={drumMachineIds.indexOf(id)}
          onSelect={(index) => setId(drumMachineIds[index])}
        />
      </div>

      <div className={styles.actions}>
        <button
          onClick={() => {
            // e.preventDefault();
            openDialog({
              type: "confirm-action",
              message:
                `This will replace ${KIT_PADS_LABEL} with new kit samples. Are you sure?`,
              buttonText: "You Betcha",
              onConfirm: () => handleSelect(id),
            });
          }}
          className={`${styles.button} ${styles.primary}`}
        >
          Load Samples
        </button>
      </div>
    </div>
  );
};

export default KitMenu;
