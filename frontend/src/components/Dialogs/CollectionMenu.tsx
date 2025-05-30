"use client";
import { useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { collectionNames } from "../../lib/collections";
import { useUIContext } from "frontend/src/app/contexts/UIContext";

type CollectionMenuProps = {
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const CollectionMenu: React.FC<CollectionMenuProps> = () => {
  const {
    initLocSamplesFromOneCollection,
    cleanupSampler,
    setAllSampleData,
    samplersRef,
    makeSamplerWithFX,
  } = useAudioContext();
  const { confirmActionRef, setShowDialog } = useUIContext();
  const [c, setC] = useState<string>(collectionNames[0]);

  const handleSelect = (collection: string) => {
    const newSamples = initLocSamplesFromOneCollection(collection);

    setAllSampleData((prev) => {
      // Filter out all keys that start with "loc-"
      const filteredPrev = Object.fromEntries(
        Object.entries(prev).filter(([key]) => !key.startsWith("loc-"))
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
          // e.preventDefault();
          confirmActionRef.current = {
            message:
              "This will replace all current Library of Congress Samples. Are you sure?",
            buttonText: "You Betcha",
            action: () => handleSelect(c),
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
