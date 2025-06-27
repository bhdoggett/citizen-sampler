"use client";
import { useState } from "react";
import { useAudioContext } from "src/app/contexts/AudioContext";
import { collectionNames } from "src/lib/loc_collections";
import { useUIContext } from "src/app/contexts/UIContext";
import { SampleTypeFE } from "src/types/audioTypesFE";

const CollectionMenu: React.FC = () => {
  const {
    initLocSamplesFromAllCollections,
    initLocSamplesFromOneCollection,
    loadSamplersToRef,
    setAllSampleData,
  } = useAudioContext();
  const { confirmActionRef, setShowDialog, setHotKeysActive } = useUIContext();
  const [c, setC] = useState<string>(collectionNames[0]);

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
    setShowDialog(null);
    setHotKeysActive(true);
  };

  return (
    <>
      <div className="flex flex-col w-full max-w-sm mx-auto">
        <label htmlFor="collection" className="text-white mb-1">
          Choose a Collection:
        </label>
        <select
          name="collection"
          id="collection"
          onChange={(e) => setC(e.target.value)}
          className="shadow-inner text-black shadow-slate-700 w-full"
        >
          {collectionNames.map((collection) => (
            <option
              key={collection}
              value={collection}
              className="w-full text-ellipsis"
            >
              {collection}
            </option>
          ))}
        </select>
      </div>

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
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        Load Samples
      </button>
    </>
  );
};

export default CollectionMenu;
