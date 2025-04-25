"use client";
import * as Tone from "tone";
import { useState, useEffect, useRef } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import { getCollectionArray, collectionNames } from "@/lib/collections";

const ChooseSample = () => {
  const {
    globalCollectionName,
    selectedSampleId,
    makeSampler,
    samplersRef,
    setAllSampleData,
  } = useAudioContext();

  const [collectionName, setCollectionName] = useState(globalCollectionName);
  const [samplesArray, setSamplesArray] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const currentPlayer = useRef<Tone.Player | null>(null);

  useEffect(() => {
    const array = getCollectionArray(collectionName);
    setSamplesArray(array);
  }, [collectionName]);

  const stopAndDisposePlayer = () => {
    if (currentPlayer.current) {
      currentPlayer.current.stop();
      currentPlayer.current.dispose();
      currentPlayer.current = null;
    }
  };

  const playSample = (url: string) => {
    stopAndDisposePlayer();
    currentPlayer.current = new Tone.Player(url).toDestination();
    currentPlayer.current.autostart = true;
  };

  const formatSampleName = (url?: string) => {
    if (!url) return "";
    const filename = url.split("/").pop();
    if (!filename) return "";
    const titleParts = filename.split("_");
    const gatheredParts = [
      titleParts[0],
      Number(titleParts[2]).toString(),
    ].join(" ");
    const title = gatheredParts.replace(/-/g, " ");
    return title.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleSelectCollection = (collection: string) => {
    setCollectionName(collection);
    setSelectedIndex(null);
    setSelectedSample(null);
  };

  const handleChooseSample = () => {
    if (selectedIndex === null || !samplesArray[selectedIndex]) return;
    const url = samplesArray[selectedIndex];
    setSelectedSample(url);
    const newSampler = makeSampler(selectedSampleId, url);
    samplersRef.current[selectedSampleId] = newSampler;
    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: { url },
    }));
  };

  return (
    <div className="flex flex-col border-2 border-black bg-slate-800 m-3 p-4 shadow-md shadow-slate-800 text-white">
      <label htmlFor="collection" className="mb-1">
        Collection:
      </label>
      <select
        name="collection"
        id="collection"
        onChange={(e) => handleSelectCollection(e.target.value)}
        className="mb-4 text-black"
      >
        {collectionNames.map((collection) => (
          <option key={collection} value={collection}>
            {collection}
          </option>
        ))}
      </select>

      <label className="mb-2">Samples:</label>
      <ul className="bg-slate-700 rounded p-2 max-h-60 overflow-y-auto space-y-1 focus:outline-none">
        {samplesArray.map((sample, index) => (
          <li
            key={sample}
            tabIndex={0}
            onFocus={() => {
              setSelectedIndex(index);
              playSample(sample);
            }}
            onBlur={() => {
              stopAndDisposePlayer();
            }}
            className={`cursor-pointer ${
              selectedIndex === index
                ? "bg-slate-700 text-white"
                : "bg-white text-black"
            }`}
          >
            {formatSampleName(sample)}
          </li>
        ))}
      </ul>

      <button
        onClick={handleChooseSample}
        className="mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-7/12"
      >
        Choose Sample
      </button>
    </div>
  );
};

export default ChooseSample;
