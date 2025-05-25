import React, { useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef } = useAudioContext();

  const locPadIds = Array.from({ length: 8 }, (_, i) => `loc-${i + 1}`);
  const kitPadIds = Array.from({ length: 4 }, (_, i) => `kit-${i + 1}`);

  const renderDrumPads = (padIds: string[]) => {
    return padIds.map((id) => {
      const samplerObj = samplersRef.current[id];
      return <DrumPad key={id} id={id} sampler={samplerObj?.sampler ?? null} />;
    });
  };

  return (
    <div className="w-1/2 mt-1">
      <div className="grid grid-cols-4 gap-0 mt-2 mb-1">
        {renderDrumPads(locPadIds)}
      </div>
      <hr />
      <div className="grid grid-cols-4 gap-0 my-1">
        {renderDrumPads(kitPadIds)}
      </div>
    </div>
  );
};

export default DrumMachine;
