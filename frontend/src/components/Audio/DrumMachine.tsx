import React from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef } = useAudioContext();

  const locPadIds = Array.from({ length: 12 }, (_, i) => `loc-${i + 1}`);
  const kitPadIds = Array.from({ length: 4 }, (_, i) => `kit-${i + 1}`);

  const renderDrumPads = (padIds: string[]) => {
    return padIds.map((id) => {
      const samplerObj = samplersRef.current[id];
      return <DrumPad key={id} id={id} sampler={samplerObj?.sampler ?? null} />;
    });
  };

  return (
    <div className="flex flex-col text-center w-1/3 ml-3 mt-1">
      <h3 className="bg-slate-800 w-full border-2 border-slate-800 text-white font-bold">
        Sample Pads
      </h3>
      <div className="grid grid-cols-4 gap-0 mt-1">
        {renderDrumPads(locPadIds)}
        {renderDrumPads(kitPadIds)}
      </div>
      {/* <div className="grid grid-cols-4 gap-0 my-1">
        {renderDrumPads(kitPadIds)}
      </div> */}
    </div>
  );
};

export default DrumMachine;
