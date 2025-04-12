"use client";
import { useAudioContext } from "../contexts/AudioContext";
import { collectionNames } from "../../lib/collections";
const CollectionMenu = () => {
  const { collectionName, setCollectionName } = useAudioContext();

  const handleSelect = (collection: string) => {
    setCollectionName(collection);
  };

  return (
    <div className="border-2 border-black bg-slate-800  m-3 p-1 shadow-md shadow-slate-800">
      <label htmlFor="collection" className="text-white">
        Choose a Collection:{" "}
      </label>
      <select
        name="collection"
        id="collection"
        onChange={(e) => handleSelect(e.target.value)}
        className="shadow-inner shadow-slate-700 shadoow-"
      >
        {collectionNames.map((collection) => (
          <option key={collection} value={collection}>
            {collection}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CollectionMenu;
