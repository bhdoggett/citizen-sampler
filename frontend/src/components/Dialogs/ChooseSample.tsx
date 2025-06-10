"use client";
import * as Tone from "tone";
import { useState, useEffect, useRef } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import {
  getCollectionArrayFromName,
  collectionNames,
} from "../../lib/loc_collections";
import {
  DrumMachineId,
  drumMachines,
  drumMachineNames,
  getDrumMachineKeyByName,
  getKitSampleTitle,
} from "src/lib/drumMachines";
import { useUIContext } from "src/app/contexts/UIContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const ChooseSample: React.FC = () => {
  const {
    selectedSampleId,
    initLocSampleData,
    initKitSampleData,
    cleanupSampler,
    updateSamplerData,
    makeSamplerWithFX,
    samplersRef,
  } = useAudioContext();
  const { setShowDialog } = useUIContext();
  const [type, setType] = useState<"loc" | "kit" | null>(null);
  const [sampleGroup, setSampleGroup] = useState<string | null>(null);
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
    if (type === "loc") {
      currentPlayer.current = new Tone.Player(url).toDestination();
    }

    if (type === "kit") {
      currentPlayer.current = new Tone.Player(
        `${API_BASE_URL}/beats/drums/${url}`
      ).toDestination();
    }
    if (currentPlayer.current) currentPlayer.current.autostart = true;
  };

  // const playKitSample = (fileName: string) => {
  //   stopAndDisposePlayer();
  //   currentPlayer.current = new Tone.Player(
  //     `${API_BASE_URL}/drums/${fileName}`
  //   ).toDestination();
  //   currentPlayer.current.autostart = true;
  // };

  // For populating the samples menu
  const formatLocSampleName = (url?: string) => {
    if (!url) return "";
    if (type === "loc") {
      const filename = url.split("/").pop();
      if (!filename) return "";
      const titleParts = filename.split("_");
      const gatheredParts = [
        titleParts[0],
        Number(titleParts[2]).toString(),
      ].join(" ");
      const title = gatheredParts.replace(/-/g, " ");
      return title.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const handleSelectSampleGroup = (collection: string) => {
    setSampleGroup(collection);
    setSelectedIndex(null);
  };

  // Update allSampleData and samplersRef when a new sample is chosen
  const handleChooseSample = async (e) => {
    e.preventDefault();
    if (
      selectedIndex === null ||
      !sampleGroup ||
      !samplesArray[selectedIndex] ||
      !selectedSampleId
    )
      return;

    const sampleSource = samplesArray[selectedIndex];

    const url =
      type === "loc"
        ? sampleSource
        : `${API_BASE_URL}/beats/drums/${sampleSource}`;

    const sampleData =
      type === "loc"
        ? initLocSampleData(selectedSampleId, url, sampleGroup)
        : initKitSampleData(
            selectedSampleId,
            url,
            getKitSampleTitle(sampleSource),
            sampleGroup
          );

    updateSamplerData(selectedSampleId, sampleData);
    cleanupSampler(selectedSampleId, samplersRef);
    samplersRef.current[selectedSampleId] = await makeSamplerWithFX(
      selectedSampleId,
      url,
      false
    );

    setShowDialog(null);
  };

  useEffect(() => {
    if (type === "loc" && sampleGroup) {
      setSamplesArray(getCollectionArrayFromName(sampleGroup));
    }
    if (type === "kit" && sampleGroup) {
      setSamplesArray(
        drumMachines[getDrumMachineKeyByName(sampleGroup) as DrumMachineId]
          .samples
      );
    }
  }, [sampleGroup, type]);

  return (
    <>
      <div className="flex flex-col w-full max-w-sm mx-auto">
        {type === null && (
          <>
            <button
              onClick={() => {
                setType("loc");
                setSampleGroup(collectionNames[0]);
              }}
              className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
            >
              Library of Congress
            </button>
            <button
              onClick={() => {
                setType("kit");
                setSampleGroup(drumMachineNames[0]);
              }}
              className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
            >
              Drum Machines
            </button>
          </>
        )}
      </div>
      <form action="submit" onSubmit={handleChooseSample}>
        <div>
          {type === "loc" && (
            <>
              <label htmlFor="collection" className="mb-1">
                Collection:
              </label>
              <select
                name="collection"
                id="collection"
                onChange={(e) => handleSelectSampleGroup(e.target.value)}
                className="mb-4 text-black"
              >
                {collectionNames.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </>
          )}

          {type === "kit" && (
            <>
              <label htmlFor="kit" className="mb-1">
                Drum Machine:
              </label>
              <select
                name="kit"
                id="kit"
                onChange={(e) => setSampleGroup(e.target.value)}
                className="mb-4 text-black"
              >
                {drumMachineNames.map((dm) => (
                  <option key={dm} value={dm}>
                    {dm}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {type && (
          <>
            <div className="flex flex-col w-full max-w-sm mx-auto">
              <label className="mb-1">Samples:</label>
              <div className="position:fixed flex flex-col bg-slate-700 p-1 max-h-36 overflow-y-auto space-y-1 focus:outline-none">
                {type &&
                  samplesArray.map((sample, index) => (
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
                        type="radio"
                        className="opacity-0 absolute"
                        value={sample}
                        onChange={(e) => {
                          setSelectedIndex(index);
                          playSample(e.target.value);
                        }}
                        onBlur={() => {
                          stopAndDisposePlayer();
                        }}
                      />
                      {type === "loc"
                        ? formatLocSampleName(sample)
                        : sample.split(".")[0].split("__")[1]}
                    </label>
                  ))}
              </div>
            </div>
            <span
              className="absolute bottom-9 left-10 text-3xl font-bold hover:text-slate-400 hover:cursor-default"
              onClick={() => setType(null)}
            >
              ←
            </span>
            <button
              type="submit"
              className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
            >
              Choose Sample
            </button>
          </>
        )}
      </form>
    </>
  );
};

export default ChooseSample;
