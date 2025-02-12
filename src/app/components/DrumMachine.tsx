"use client";
import DrumPad from "./DrumPad";

const DrumMachine = ({ samples }) => {
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
