import React, { useState, useEffect, useRef } from "react";
import { useAudioContext } from "../app/contexts/AudioContext";
import DrumPad from "./DrumPad";
import PitchGrid from "./PitchGrid"; // ✅ import your PitchGrid component

const DrumMachine = () => {
  const { allSampleData, samplersRef, selectedSampleId } = useAudioContext();
  const [samplersLoaded, setSamplersLoaded] = useState(false);
  const [samplerCount, setSamplerCount] = useState(0);
  const currentSampleDataRef = useRef(allSampleData[selectedSampleId]);
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
    <div>
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
          onClick={() => setShowGrid((prev) => !prev)}
        >
          Switch to {showGrid ? "Drum Pads" : "Pitch Grid"}
        </button>
      </div>

      <div className={`${showGrid ? "hidden" : ""} `}>
        <div className="grid grid-cols-4 gap-0 my-3">
          {renderDrumPads("loc")}
        </div>
        <hr />
        <div className="grid grid-cols-4 gap-0 my-3">
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
