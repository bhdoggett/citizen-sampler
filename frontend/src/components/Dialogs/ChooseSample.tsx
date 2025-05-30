"use client";
import * as Tone from "tone";
import { useState, useEffect, useRef } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import {
  getCollectionArrayFromName,
  collectionNames,
} from "../../lib/collections";
import { useUIContext } from "frontend/src/app/contexts/UIContext";

const ChooseSample: React.FC = () => {
  const {
    selectedSampleId,
    initLocSampleData,
    cleanupSampler,
    updateSamplerData,
    makeSampler,
    samplersRef,
  } = useAudioContext();

  const { setShowDialog } = useUIContext();

  const [collectionName, setCollectionName] = useState<string>(
    collectionNames[0]
  );
  const [samplesArray, setSamplesArray] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const currentPlayer = useRef<Tone.Player | null>(null);

  // Stop demo sample playback
  const stopAndDisposePlayer = () => {
    if (currentPlayer.current) {
      currentPlayer.current.stop();
      currentPlayer.current.dispose();
      currentPlayer.current = null;
    }
  };

  // Play sample demo audio
  const playSample = (url: string) => {
    stopAndDisposePlayer();
    currentPlayer.current = new Tone.Player(url).toDestination();
    currentPlayer.current.autostart = true;
  };

  // For populating the samples menu
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
  };

  // Update allSampleData and samplersRef when a new sample is chosen
  const handleChooseSample = async () => {
    if (
      selectedIndex === null ||
      !samplesArray[selectedIndex] ||
      !selectedSampleId
    )
      return;

    const url = samplesArray[selectedIndex];

    const sampleData = initLocSampleData(selectedSampleId, url, collectionName);

    updateSamplerData(selectedSampleId, sampleData);
    cleanupSampler(selectedSampleId, samplersRef);
    samplersRef.current[selectedSampleId] = await makeSampler(
      selectedSampleId,
      url,
      false
    );

    setShowDialog(null);
  };

  useEffect(() => {
    const array = getCollectionArrayFromName(collectionName);
    setSamplesArray(array);
  }, [collectionName]);

  return (
    <>
      <div className="flex flex-col w-full max-w-sm mx-auto">
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
      </div>

      <div className="flex flex-col w-full max-w-sm mx-auto">
        <label className="mb-1">Samples:</label>
        <div className="position:fixed flex flex-col bg-slate-700 p-1 max-h-36 overflow-y-auto space-y-1 focus:outline-none">
          {samplesArray.map((sample, index) => (
            <label
              key={index}
              className={`cursor-pointer pl-1 ${
                selectedIndex === index
                  ? "bg-slate-700 text-white"
                  : "bg-white text-black"
              }`}
            >
              <input
                name="samples"
                className="opacity-0 absolute"
                type="radio"
                value={sample}
                onChange={(e) => {
                  setSelectedIndex(index);
                  playSample(e.target.value);
                }}
                onBlur={() => {
                  stopAndDisposePlayer();
                }}
              />
              {formatSampleName(sample)}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleChooseSample}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        Choose Sample
      </button>
    </>
  );
};

export default ChooseSample;
