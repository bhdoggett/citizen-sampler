"use client";
import { useAudioContext } from "../contexts/AudioContext";
import DrumPad from "./DrumPad";
import Transport from "./Transport";
import { SampleData } from "../types/SampleData";
import { useState, useEffect } from "react";

const DrumMachine = () => {
  const { locSamples, kitSamples } = useAudioContext();
  const [contextVersion, setContextVersion] = useState(0);
  const [selectedSample, setSelectedSample] = useState(null);

  console.log("locSamples:", locSamples);

  useEffect(() => {
    setContextVersion((prev) => prev + 1);
    console.log("Current Context Version:", contextVersion);
  }, [locSamples]);

  return (
    <div key={contextVersion}>
      <div className="grid grid-cols-4 gap-4 my-3">
        {locSamples?.length > 0 ? (
          locSamples.map((sample: SampleData) => (
            <DrumPad key={sample.id} sample={sample} />
          ))
        ) : (
          <div>Loading local samples...</div>
        )}
      </div>
      <hr />
      <div className="grid grid-cols-4 gap-4 my-3">
        {kitSamples.map((sample: SampleData) => (
          <DrumPad key={sample.id} sample={sample} />
        ))}
      </div>
    </div>
  );
};

export default DrumMachine;
