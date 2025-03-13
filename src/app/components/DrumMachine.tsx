import { useState, useEffect } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef, kitRef } = useAudioContext();
  const [samplersLoaded, setSamplersLoaded] = useState(false); // Track if samplers are loaded

  // Monitor changes to samplersRef and check if it has 8 samplers
  const [samplerCount, setSamplerCount] = useState(0);
  const [kitCount, setKitCount] = useState(0);

  // Update counts when refs change
  useEffect(() => {
    const checkSamplers = () => {
      setSamplerCount(Object.keys(samplersRef.current).length);
      setKitCount(Object.keys(kitRef.current).length);
    };

    // Check immediately
    checkSamplers();

    // Set up an interval to check periodically
    const intervalId = setInterval(checkSamplers, 10);

    return () => clearInterval(intervalId);
  }, [kitRef, samplersRef]); // Empty dependency array since we're using refs inside

  // Set loaded state based on counts
  useEffect(() => {
    if (samplerCount === 8 && kitCount === 4) {
      setSamplersLoaded(true);
    }
  }, [samplerCount, kitCount]);

  if (!samplersLoaded) {
    return <div>Loading samplers...</div>; // Display loading message while samplers are not loaded
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 my-3">
        {Object.entries(samplersRef.current).map(([id, samplerNodes]) => (
          <DrumPad key={id} sampler={samplerNodes.sampler} />
        ))}
      </div>

      <hr />

      <div className="grid grid-cols-4 gap-4 my-3">
        {Object.entries(kitRef.current).map(([id, samplerNodes]) => (
          <DrumPad key={id} sampler={samplerNodes.sampler} />
        ))}
      </div>
    </div>
  );
};

export default DrumMachine;
