import { useState, useEffect } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef } = useAudioContext();
  const [samplersLoaded, setSamplersLoaded] = useState(false); // Track if samplers are loaded

  // Monitor changes to samplersRef and check if it has 8 samplers
  const [samplerCount, setSamplerCount] = useState(0);

  // Update counts when refs change
  useEffect(() => {
    const checkSamplers = () => {
      setSamplerCount(Object.keys(samplersRef.current).length);
    };

    // Check immediately
    checkSamplers();

    // Set up an interval to check periodically
    const intervalId = setInterval(checkSamplers, 10);

    return () => clearInterval(intervalId);
  }, [samplersRef]);

  // Set loaded state based on counts
  useEffect(() => {
    if (samplerCount === 12) {
      setSamplersLoaded(true);
    }
    console.log("samplersRef", samplersRef.current);
  }, [samplerCount]);

  if (!samplersLoaded) {
    return <div>Loading samplers...</div>; // Display loading message while samplers are not loaded
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 my-3">
        {Object.entries(samplersRef.current)
          .filter((entry) => {
            return entry[0].includes("loc");
          })
          .map(([id, samplerNodes]) => (
            <DrumPad key={id} id={id} sampler={samplerNodes.sampler} />
          ))}
      </div>

      <hr />

      <div className="grid grid-cols-4 gap-4 my-3">
        {Object.entries(samplersRef.current)
          .filter((entry) => {
            return entry[0].includes("kit");
          })
          .map(([id, samplerNodes]) => (
            <DrumPad key={id} id={id} sampler={samplerNodes.sampler} />
          ))}
      </div>
    </div>
  );
};

export default DrumMachine;
