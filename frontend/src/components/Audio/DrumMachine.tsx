import React from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef } = useAudioContext();

  // Combine all pad IDs into one array
  const allPadIds = Array.from({ length: 16 }, (_, i) => `pad-${i + 1}`);

  return (
    <div className="flex flex-col text-center w-1/2 mt-1">
      <h3 className="bg-slate-800 w-full border-2 border-slate-800 text-white font-bold">
        Sample Pads
      </h3>
      <div className="grid grid-cols-4 gap-0 mt-1 touch-none select-none">
        {allPadIds.map((id) => {
          const samplerObj = samplersRef.current[id];
          return (
            <DrumPad key={id} id={id} sampler={samplerObj?.sampler ?? null} />
          );
        })}
      </div>
    </div>
  );
};

export default DrumMachine;
