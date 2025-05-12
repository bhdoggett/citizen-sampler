"use client";
import { useAudioContext } from "@/app/contexts/AudioContext";
import { collectionNames } from "@/lib/collections";

const CollectionMenu = () => {
  const { setGlobalCollectionName } = useAudioContext();

  const handleSelect = (collection: string) => {
    setGlobalCollectionName(collection);
  };

  return (
    <div className="flex mx-auto border-2 border-black bg-slate-800  m-3 p-1 shadow-md shadow-slate-800 w-full">
      <label htmlFor="collection" className="text-white w-1/4">
        Choose a Collection:{" "}
      </label>
      <select
        name="collection"
        id="collection"
        onChange={(e) => handleSelect(e.target.value)}
        className="shadow-inner shadow-slate-700 w-3/4"
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
  );
};

export default CollectionMenu;
