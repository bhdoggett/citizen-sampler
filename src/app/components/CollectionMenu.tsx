"use client";
import { useAudioContext } from "../contexts/AudioContext";
import { collectionNames } from "../../lib/collections";
const CollectionMenu = () => {
  const { collectionName, setCollectionName } = useAudioContext();

  const handleSelect = (collection: string) => {
    setCollectionName(collection);
  };

  return (
    <div>
      <label htmlFor="collection">Select a Collection: </label>
      <select
        name="collection"
        id="collection"
        onChange={(e) => handleSelect(e.target.value)}
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
