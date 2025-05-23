"use client";
import { useState } from "react";
import { useAudioContext } from "../app/contexts/AudioContext";
import { collectionNames } from "../lib/collections";

type CollectionMenuProps = {
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const CollectionMenu: React.FC<CollectionMenuProps> = ({
  setShowDialog,
  setHotKeysActive,
}) => {
  const {
    initLocSamplesFromOneCollection,
    cleanupSampler,
    setAllSampleData,
    samplersRef,
    makeSampler,
  } = useAudioContext();
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
      samplersRef.current[key] = await makeSampler(sample.id, sample.url);
    });
  };

  return (
    <div className="flex flex-col border-2 border-black bg-slate-800 m-3 p-4 shadow-md shadow-slate-800 text-white">
      <button
        onClick={() => setShowDialog(null)}
        className="absolute top-5 right-6 text-white hover:text-black"
      >
        ✖
      </button>
      <div className="flex flex-col">
        <label htmlFor="collection" className="text-white pb-2">
          Choose a Collection:
        </label>
        <select
          name="collection"
          id="collection"
          onChange={(e) => setC(e.target.value)}
          className="shadow-inner text-black shadow-slate-700 w-3/4"
        >
          {collectionNames.map((collection) => (
            <option
              key={collection}
              value={collection}
              className="w-3/4 text-ellipsis"
            >
              {collection}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          handleSelect(c);
          setShowDialog(null);
          setHotKeysActive(true);
        }}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-1/4"
      >
        Load Samples
      </button>
    </div>
  );
};

export default CollectionMenu;
