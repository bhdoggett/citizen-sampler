"use client";
import { useState } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { collectionNames } from "src/lib/loc_collections";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";
import OptionList from "./OptionList";
import { SampleTypeFE } from "src/types/audioTypesFE";
import { LOC_PADS_LABEL } from "src/lib/constants/padLayout";

const CollectionMenu: React.FC = () => {
  const {
    initLocSamplesFromAllCollections,
    initLocSamplesFromOneCollection,
    setAllSampleData,
  } = useAudioContext();
  const { openDialog, closeDialog } = useUIContext();
  const [index, setIndex] = useState(0);
  const c = collectionNames[index];

  const handleSelect = (collection?: string) => {
    const newSamples = collection
      ? initLocSamplesFromOneCollection(collection)
      : initLocSamplesFromAllCollections();

    setAllSampleData((prev) => {
      // Filter out all samples with with type === "loc"
      const filteredPrev: Record<string, SampleTypeFE> = Object.fromEntries(
        Object.entries(prev).filter(([, sample]) => sample.type !== "loc")
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
          Collection
        </span>
        <OptionList
          name="collection"
          label="Collection"
          items={collectionNames}
          selectedIndex={index}
          onSelect={setIndex}
        />
      </div>

      <div className={styles.actions}>
        <button
          onClick={() => {
            openDialog({
              type: "confirm-action",
              message:
                `This will replace ${LOC_PADS_LABEL} with new Library of Congress Samples. Are you sure?`,
              buttonText: "You Betcha",
              onConfirm: c === "All" ? () => handleSelect() : () => handleSelect(c),
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

export default CollectionMenu;
