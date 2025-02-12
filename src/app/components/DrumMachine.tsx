"use client";
import { useAudioContext } from "../contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samples } = useAudioContext();

  console.log("samples:", samples);
  return (
    <div className="grid grid-cols-4 gap-4">
      {samples.map((sample, index) => (
        <DrumPad sample={sample} key={index} />
      ))}
    </div>
  );
};

export default DrumMachine;
