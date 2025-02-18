"use client";
import { useEffect, useRef, useState } from "react";
import { SampleType } from "../types/SampleType";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import { Subdivision, TransportTime } from "tone/build/esm/core/type/Units";

type DrumPadProps = {
  sample: SampleType;
};

type SampleStartPositions = {
  raw: TransportTime;
  quantized: Subdivision;
};
const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const {
    masterGain,
    isRecording,
    isPlaying,
    quantizeRecordActive,
    quantizeSetting,
  } = useAudioContext();
  const playerRef = useRef<Tone.Player | null>(null);
  const [sampleGainNode, setSampleGainNode] = useState<Tone.Gain | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Track whether the sample is loaded
  const [sampleStartPositions, setSampleStartPositions] = useState<
    SampleStartPositions[]
  >([]);
  const [sampleReleasePositions, setSampleReleasePositions] = useState([]);
  const [sortedSamples, setSortedSamples] = useState([]);
  const [lastPositions, setLastPositions] = useState([]); // eventually use this to add "undo" functionality

  //Load sample
  useEffect(() => {
    if (!sample.audioUrl) return;

    // Create and load the sample
    const player = new Tone.Player({
      url: sample.audioUrl,
      autostart: false,
      onload: () => {
        setIsLoaded(true); // Mark as loaded
      },
      onerror: (error) => {
        console.error("Error loading sample:", error);
        setIsLoaded(false);
      },
    }).connect(masterGain);

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        console.log("Player disposed");
      }
    };
  }, [sample]);

  useEffect(() => {
    const samples = setSortedSamples(samples);
  }, [sampleStartPositions, sampleReleasePositions]);
  //Create sampleGainNode
  useEffect(() => {
    const gainNode = new Tone.Gain(1);
    setSampleGainNode(gainNode);

    if (gainNode && playerRef.current) {
      // Connect player to the gain node, and then connect gain node to masterGain
      playerRef.current.connect(gainNode);
      gainNode.connect(masterGain);
    }

    // Clean up the gain node when the component is unmounted or sample changes
    return () => {
      if (gainNode) {
        gainNode.disconnect();
      }
    };
  }, [masterGain]);

  const handlePressPad = () => {
    console.log(`sample ${sample.id} start position:`, sampleStartPositions);
    console.log("Quantize Setting:", quantizeSetting);

    if (!isLoaded) {
      console.warn("Sample not loaded yet!");
      return;
    }

    if (playerRef.current) {
      playerRef.current.start();
      console.log("Player started");
    }

    if (isRecording) {
      const newSampleStartTime = {
        raw: Tone.Transport.position, // Unquantized time
        quantized: `${Tone.Transport.position}@${quantizeSetting}n`, // Quantized time
      };

      setSampleStartPositions((prevPositions) => {
        const sortedSampleStartPositions = [
          ...prevPositions,
          newSampleStartTime,
        ].sort((a, b) => {
          const timeA = Tone.Time(a.raw).toSeconds();
          const timeB = Tone.Time(b.raw).toSeconds();
          return timeA - timeB;
        });
        return sortedSampleStartPositions;
      });
    }
  };

  // const splitSamplePositions = () => {
  //   return sampleStartPositions.map
  // }

  const handleReleasePad = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      console.log("Player stopped");
    }

    if (isRecording) {
      const releaseTime = Tone.Transport.position;
      if (releaseTime >= Tone.Transport.loopEnd) {
        // Adjust release time slightly if we're near the loop boundary
        setSampleReleasePositions([
          ...sampleReleasePositions,
          Tone.Transport.position + 0.05, // Add a small buffer
        ]);
      } else {
        setSampleReleasePositions([...sampleReleasePositions, releaseTime]);
      }
    }

    console.log("sampleReleasePositions:", sampleReleasePositions);
  };

  if (isPlaying) {
    sampleStartPositions.forEach(({ raw, quantized }) => {
      const startTime = quantizeRecordActive ? quantized : raw; // Choose time based on setting

      Tone.Transport.schedule((time) => {
        playerRef.current?.start(time);
      }, startTime);
    });

    sampleReleasePositions.forEach((releaseTime) => {
      Tone.Transport.schedule((time) => {
        if (playerRef.current) {
          playerRef.current.stop(time);
        }
      }, releaseTime);
    });
  }

  //Ensure that regardlenss of the sample's start and release schedule, all playback will stop when isPlaying is set to false.
  if (!isPlaying && playerRef.current) {
    playerRef.current.stop(0);
  }

  return (
    <div>
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className="bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-14 h-14 active:bg-slate-500"
        disabled={!isLoaded} // Disable button until sample loads
      >
        {isLoaded ? sample.label : "Loading..."}
      </button>
    </div>
  );
};

export default DrumPad;
