"use client";
import { useAudioContext } from "../contexts/AudioContext";
import DrumPad from "./DrumPad";
import Transport from "./Transport";
import { SampleType } from "../types/SampleType";
import { useState, useEffect } from "react";

const DrumMachine = () => {
  const { njbSamples, kitSamples } = useAudioContext();
  const [contextVersion, setContextVersion] = useState(0);
  const [selectedSample, setSelectedSample] = useState(null);

  console.log("njbSamples:", njbSamples);

  useEffect(() => {
    setContextVersion((prev) => prev + 1);
    console.log("Current Context Version:", contextVersion);
  }, [njbSamples]);

  return (
    <div key={contextVersion}>
      <div className="grid grid-cols-4 gap-4 my-3">
        {njbSamples.map((sample) => (
          <DrumPad key={sample.id} sample={sample} />
        ))}
      </div>
      <hr />
      <div className="grid grid-cols-4 gap-4 my-3">
        {kitSamples.map((sample) => (
          <DrumPad key={sample.id} sample={sample} />
        ))}
      </div>
    </div>
  );
};

export default DrumMachine;
