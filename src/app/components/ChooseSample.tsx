"use client";
import * as Tone from "tone";
import { useState, useEffect } from "react";
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
  const [samplesArray, setSamplesArray] = useState<string[] | []>([]);
  const [sampleNames, setSampleNames] = useState<string[] | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  //test some things
  useEffect(() => {
    console.log("globalCollectionName", globalCollectionName);
    console.log("samplesArray", samplesArray);
    console.log("samplesArray[0]", samplesArray[0]);
    // console.log("sampleNames", sampleNames);
    console.log("getSampleName", getSampleName(samplesArray[0])); // console log the getSampleName function working on selectedSample
  }, [samplesArray, sampleNames, globalCollectionName]);

  const getSampleName = (url?: string) => {
    if (!url) return "";

    const filename = url.split("/").pop();
    if (!filename) return "";

    const rawTitle = filename.split("_")[0];
    const title = rawTitle.replace(/-/g, " ");
    return title.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  useEffect(() => {
    if (samplesArray.length > 0) {
      const names = samplesArray.map((url) => getSampleName(url));
      setSampleNames(names);
    }
  }, [samplesArray]);

  //function to format sample names based on sample urls

  // i need the global context function to update the sampler ref at that id
  // i need to globcal context allSampleData state to update that at the right id
  // i need a UI to update the name of the selected sample
  // i need a UI to udpate the name of the selected collection
  // when tha collection name changes the select element for the sample names needs to update accordingly
  // when a user tabs through teh sample names a Tone.plyer needs to start for that sample. sample names shouldn't look like the file name with al the -'s and _'s, so i need a funciton for format the title, but tabbing through thte titles needs to trigger the player at the appropriate corresponding url

  useEffect(() => {
    const array = getCollectionArray(collectionName);
    setSamplesArray(array);
  }, [collectionName]);

  // Play audio for selected sample
  useEffect(() => {
    if (selectedSample) {
      const player = new Tone.Player(selectedSample).toDestination();
      player.autostart = true;
    }
  }, [selectedSample]);

  const handleSelectCollection = (collection: string) => {
    setCollectionName(collection);
  };

  // const handleSelectSample = (sample: string) => {
  //   setSelectedSample(sample);
  // };

  // const hansleLoadSample = () => {
  //   const sampler = makeSampler(selectedSampleId, selectedSample);
  // };

  return (
    <div className="border-2 border-black bg-slate-800  m-3 p-1 shadow-md shadow-slate-800">
      <label htmlFor="collection" className="text-white">
        Collection:{" "}
      </label>
      <select
        name="collection"
        id="collection"
        onChange={(e) => handleSelectCollection(e.target.value)}
        className="shadow-inner shadow-slate-700 shadoow-"
      >
        {collectionNames.map((collection) => (
          <option key={collection} value={collection}>
            {collection}
          </option>
        ))}
      </select>

      <label htmlFor="sample" className="text-white">
        Sample:{" "}
      </label>
      <select
        name="sample"
        id="sample"
        onChange={(e) => setSelectedSample(e.target.value)}
        className="shadow-inner shadow-slate-700 shadoow-"
      >
        {samplesArray &&
          samplesArray.map((sample) => (
            <option key={sample} value={sample}>
              {getSampleName(sample)}
            </option>
          ))}
      </select>
    </div>
  );
};

export default ChooseSample;
