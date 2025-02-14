"use client";
import { useAudioContext } from "../contexts/AudioContext";
import DrumPad from "./DrumPad";
import { SampleType } from "../types/SampleType";
import { useState, useEffect } from "react";

const DrumMachine = () => {
  const { njbSamples } = useAudioContext();
  const [contextVersion, setContextVersion] = useState(0);

  console.log("njbSamples:", njbSamples);

  useEffect(() => {
    setContextVersion((prev) => prev + 1);
    console.log("Current Context Version:", contextVersion);
  }, [njbSamples]);

  const kick: SampleType = {
    title: "Kick_Cobalt_2",
    label: "Kick",
    type: "drumKit",
    audioUrl: "/samples/drums/kicks/Kick_Cobalt_2.wav",
  };

  const snare: SampleType = {
    title: "Snare_Astral_1",
    label: "Snare",
    type: "drumKit",
    audioUrl: "/samples/drums/snares/Snare_Astral_1.wav",
  };

  const hat: SampleType = {
    title: "ClosedHH_Alessya_DS",
    type: "drumKit",
    label: "HiHat",
    audioUrl: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
  };

  const perc: SampleType = {
    title: "Perc_Spicy_7",
    type: "drumKit",
    label: "Perc",
    audioUrl: "/samples/drums/perc/Perc_Spicy_7.wav",
  };

  const kitSamples = [kick, snare, hat, perc];

  return (
    <div key={contextVersion}>
      <div className="grid grid-cols-4 gap-4 my-3">
        {njbSamples.map((sample, index) => (
          <DrumPad sample={sample} key={index} />
        ))}
      </div>
      <hr />
      <div className="grid grid-cols-4 gap-4 my-3">
        {" "}
        {kitSamples.map((sample, index) => (
          <DrumPad sample={sample} key={index} />
        ))}
      </div>
    </div>
  );
};

export default DrumMachine;
