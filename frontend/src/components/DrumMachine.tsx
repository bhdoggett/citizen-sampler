import React, { useState, useEffect } from "react";
import { useAudioContext } from "../app/contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef, selectedSampleId } = useAudioContext();
  const [samplersLoaded, setSamplersLoaded] = useState(false);
  const [samplerCount, setSamplerCount] = useState(0);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  useEffect(() => {
    const checkSamplers = () => {
      setSamplerCount(Object.keys(samplersRef.current).length);
    };

    checkSamplers();
    const intervalId = setInterval(checkSamplers, 10);
    return () => clearInterval(intervalId);
  }, [samplersRef]);

  useEffect(() => {
    if (samplerCount === 12) {
      setSamplersLoaded(true);
    }
  }, [samplerCount]);

  const renderDrumPads = (type: "loc" | "kit" | "loading") => {
    return Object.entries(samplersRef.current)
      .filter(([id]) => id.includes(type))
      .map(([id, samplerNodes]) => (
        <DrumPad
          key={id}
          id={id}
          sampler={samplerNodes.sampler}
          showGrid={showGrid}
        />
      ));
  };

  if (!samplersLoaded) {
    return <div>Loading samplers...</div>;
  }

  return (
    <div className="mt-1">
      <div className="flex mx-auto">
        <div className="w-full border-2 flex mx-auto border-black  shadow shadow-slate-800 p-1 z-20">
          <button
            className={`w-1/2 px-3 py-1 mr-0.5 border-1 border-black ${showGrid ? " bg-slate-800 text-white shadow shadow-slate-400" : "bg-slate-200 shadow-inner shadow-slate-700"}`}
            onClick={() => setShowGrid(false)}
          >
            Drum Pads
          </button>
          <button
            className={`w-1/2 px-3 py-1 ml-0.5 border-2 border-black ${showGrid ? "bg-slate-200  shadow-inner shadow-slate-700" : "bg-slate-800 text-white shadow shadow-slate-400"}`}
            onClick={() => setShowGrid(true)}
          >
            Pitch Grid
          </button>
        </div>
      </div>

      <div className={`${showGrid ? "hidden" : ""} `}>
        <div className="grid grid-cols-4 gap-0 mt-2 mb-1">
          {renderDrumPads("loc")}
        </div>
        <hr />
        <div className="grid grid-cols-4 gap-0 my-1">
          {renderDrumPads("kit")}
        </div>
      </div>

      {showGrid && (
        <div className="flex justify-center">
          <DrumPad
            id={selectedSampleId}
            sampler={samplersRef.current[selectedSampleId].sampler}
            showGrid={showGrid}
          />
        </div>
      )}
    </div>
  );
};

export default DrumMachine;
