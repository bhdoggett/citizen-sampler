"use client";
import { useAudioContext } from "../contexts/AudioContext";
import { collections } from "../../lib/collections";
const CollectionMenu = () => {
  const { collection, setCollection } = useAudioContext();

  const handleSelect = (collection) => {
    setCollection(collection);
  };

  return (
    <div>
      <label htmlFor="collection">Select Collection</label>
      <select name="collection" id="collection" onChange={handleSelect}>
        {collections.map((collection) => (
          <option key={collection} value={collection}>
            {collection}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CollectionMenu;
