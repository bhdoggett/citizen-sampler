"use client";
import { useState } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { collectionNames } from "src/lib/loc_collections";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";
import OptionList from "./OptionList";
import { SampleTypeFE } from "src/types/audioTypesFE";

const CollectionMenu: React.FC = () => {
  const {
    initLocSamplesFromAllCollections,
    initLocSamplesFromOneCollection,
    loadSamplersToRef,
    setAllSampleData,
    storeAudioInIndexedDB,
  } = useAudioContext();
  const { confirmActionRef, setShowDialog, setHotKeysActive } = useUIContext();
  const [index, setIndex] = useState(0);
  const c = collectionNames[index];

  const handleSelect = async (collection?: string) => {
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
            confirmActionRef.current = {
              message:
                "This will replace pads 1-12 with new Library of Congress Samples. Are you sure?",
              buttonText: "You Betcha",
              action: c === "All" ? () => handleSelect() : () => handleSelect(c),
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

export default CollectionMenu;
