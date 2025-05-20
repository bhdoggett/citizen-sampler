import React, { useState } from "react";
import { useAudioContext } from "../app/contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef, selectedSampleId } = useAudioContext();
  const [showGrid, setShowGrid] = useState<boolean>(false);

  const locPadIds = Array.from({ length: 8 }, (_, i) => `loc-${i + 1}`);
  const kitPadIds = Array.from({ length: 4 }, (_, i) => `kit-${i + 1}`);

  const renderDrumPads = (padIds: string[]) => {
    return padIds.map((id) => {
      const samplerObj = samplersRef.current[id];
      return (
        <DrumPad
          key={id}
          id={id}
          sampler={samplerObj?.sampler ?? null}
          showGrid={showGrid}
        />
      );
    });
  };

  return (
    <div className="mt-1">
      <div className="flex mx-auto">
        <div className="w-full border-2 flex mx-auto border-black shadow shadow-slate-800 p-1 z-20">
          <button
            className={`w-1/2 px-3 py-1 mr-0.5 border-1 border-black ${
              showGrid
                ? " bg-slate-800 text-white shadow shadow-slate-400"
                : "bg-slate-200 shadow-inner shadow-slate-700"
            }`}
            onClick={() => setShowGrid(false)}
          >
            Drum Pads
          </button>
          <button
            className={`w-1/2 px-3 py-1 ml-0.5 border-2 border-black ${
              showGrid
                ? "bg-slate-200 shadow-inner shadow-slate-700"
                : "bg-slate-800 text-white shadow shadow-slate-400"
            }`}
            onClick={() => setShowGrid(true)}
          >
            Pitch Grid
          </button>
        </div>
      </div>

      <div className={`${showGrid ? "hidden" : ""}`}>
        <div className="grid grid-cols-4 gap-0 mt-2 mb-1">
          {renderDrumPads(locPadIds)}
        </div>
        <hr />
        <div className="grid grid-cols-4 gap-0 my-1">
          {renderDrumPads(kitPadIds)}
        </div>
      </div>

      {showGrid && selectedSampleId && (
        <div className="flex justify-center">
          <DrumPad
            id={selectedSampleId}
            sampler={samplersRef.current[selectedSampleId]?.sampler ?? null}
            showGrid={showGrid}
          />
        </div>
      )}
    </div>
  );
};

export default DrumMachine;
