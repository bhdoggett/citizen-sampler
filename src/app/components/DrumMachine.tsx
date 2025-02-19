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

  // const kick: SampleType = {
  //   title: "Kick_Cobalt_2",
  //   label: "Kick",
  //   type: "drumKit",
  //   audioUrl: "/samples/drums/kicks/Kick_Cobalt_2.wav",
  //   id: "drum-1",
  // };

  // const snare: SampleType = {
  //   title: "Snare_Astral_1",
  //   label: "Snare",
  //   type: "drumKit",
  //   audioUrl: "/samples/drums/snares/Snare_Astral_1.wav",
  //   id: "drum-2",
  // };

  // const hat: SampleType = {
  //   title: "ClosedHH_Alessya_DS",
  //   type: "drumKit",
  //   label: "HiHat",
  //   audioUrl: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
  //   id: "drum-3",
  // };

  // const perc: SampleType = {
  //   title: "Perc_Spicy_7",
  //   type: "drumKit",
  //   label: "Perc",
  //   audioUrl: "/samples/drums/perc/Perc_Spicy_7.wav",
  //   id: "drum-4",
  // };

  // const kitSamples = [kick, snare, hat, perc];

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
