"use client";
import { useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";
import OptionList from "./OptionList";
import { DrumMachineId, drumMachines } from "src/lib/drumMachines";

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
            confirmActionRef.current = {
              message:
                "This will replace pads 13-16 with new kit samples. Are you sure?",
              buttonText: "You Betcha",
              action: () => handleSelect(id),
            };
            setShowDialog("confirm-action");
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
