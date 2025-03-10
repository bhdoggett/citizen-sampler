"use client";
import { useEffect, useRef, useState } from "react";
import { SampleData } from "../types/SampleData";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import { Subdivision, TransportTime } from "tone/build/esm/core/type/Units";
import type { SampleData } from "../types/SampleData";
import quantize from "../functions/quantize";

type DrumPadProps = {
  sample: SampleData;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const {
    transport,
    masterGainNode,
    isRecording,
    isPlaying,
    quantizeValue,
    quantizeActive,
    allSampleData,
    setAllSampleData,
  } = useAudioContext();

  const [isLoaded, setIsLoaded] = useState(false);
  const [sampleData, setSampleData] = useState<SampleData>({
    ...sample,
    times: [],
  });

  const sampler = useRef<Tone.Sampler | null>(null);
  // const highpass = useRef<Tone.Filter>(new Tone.Filter(0, "highpass"));
  // const lowpass = useRef<Tone.Filter>(new Tone.Filter(20000, "lowpass"));
  const pitch = useRef<number>(0); // do i need this?
  const finetune = useRef<number>(0); // do i need this?
  const sampleGainNode = useRef<Tone.Gain>(
    new Tone.Gain(1).connect(masterGainNode.current)
  );

  useEffect(() => {
    if (!sample.url) return;

    sampler.current = new Tone.Sampler({
      urls: { C4: sample.url },
      attack: sample.settings.attack,
      release: sample.settings.release,
      onload: () => setIsLoaded(true),
      onerror: (error) => {
        console.error("Error loading sample:", error);
        setIsLoaded(false);
      },
    });

    // sampler.current.toDestination();
    sampler.current.connect(sampleGainNode.current);

    return () => {
      sampler.current?.dispose();
      console.log("Sampler disposed");
    };
  }, [sample, sampler, masterGainNode]);

  // for some reason the volume of playback alters with the number of times played. the longer the 'times' array. the greater the distortion. one playback is at standard volume. two doubles the first and halves the second, etc.

  useEffect(() => {
    if (!isPlaying || sampleData.times.length === 0) return;

    const bpm = transport.current.bpm.value;

    // Prepare the events array
    const events = sampleData.times.map((e) => {
      const quantizedTime = quantizeActive
        ? quantize(e.startTime, bpm, quantizeValue)
        : e.startTime;

      return [
        quantizedTime,
        {
          startTime: quantizedTime,
          duration: e.duration,
          // velocity: e.velocity || 1, // Default velocity to 1 if not set
        },
      ];
    });

    // Create the Tone.Part with the mapped events
    const part = new Tone.Part((time, event) => {
      // You can apply velocity scaling here if needed, e.g.:

      console.log(`Triggering sample at: ${time}, duration: ${event.duration}`);

      sampler.current?.triggerAttackRelease(
        "C4", // or event.note if you have different notes!
        event.duration,
        time
      );
    }, events);

    part.start(0);

    // Function to clean up the part when stopping playback or unmounting
    const disposePart = () => {
      if (part) {
        try {
          if (part.state === "started") {
            part.stop();
          }
          part.dispose();
        } catch (error) {
          console.warn("Error disposing part:", error);
        }
      }
    };

    return () => {
      disposePart();
    };
  }, [isPlaying, sampleData, quantizeActive, quantizeValue]);

  useEffect(() => {
    setAllSampleData((prev: SampleData[]) => {
      const existingIndex = prev.findIndex((item) => item.id === sampleData.id);
      if (existingIndex !== -1) {
        const updatedData = [...prev];
        updatedData[existingIndex] = sampleData;
        return updatedData;
      } else {
        return [...prev, sampleData];
      }
    });
  }, [sampleData, setAllSampleData]);

  const handlePressPad = () => {
    if (!isLoaded || !sampler.current) return;

    sampler.current.triggerAttack("C4");

    if (isPlaying && isRecording) {
      const startTime = transport.current.seconds;
      setSampleData((prevData) => {
        const newSampleData = {
          ...prevData,
          times: [...prevData.times, { startTime, duration: 0 }],
        };

        return newSampleData;
      });
      // console.log(`sample-${sample.id} data:", sampleData`);
    }
  };

  const handleReleasePad = () => {
    if (!isLoaded || !sampler.current) return;

    const releaseTime = transport.current.seconds;
    sampler.current.triggerRelease("C4");

    if (isRecording && isPlaying) {
      setSampleData((prevData) => {
        const updatedTimes = prevData.times.map((t, i, arr) => {
          switch (true) {
            case i === arr.length - 1 &&
              t.duration === 0 &&
              releaseTime > t.startTime:
              return { ...t, duration: releaseTime - t.startTime };
            case i === arr.length - 1 &&
              t.duration === 0 &&
              releaseTime < t.startTime: // if sample start and release overlaps the end of the loop, the duration calculation needs to be swapped.
              return { ...t, duration: t.startTime - releaseTime };
            default:
              return t;
          }
        });

        const newSampleData = { ...prevData, times: updatedTimes };
        return newSampleData;
      });
    }
    console.log(`sample-${sample.id} data:`, sampleData);
    console.log(`All Sample Data:`, allSampleData);
  };

  return (
    <div>
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onMouseLeave={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className="bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-14 h-14 active:bg-slate-500 shadow-sm shadow-black"
        disabled={!isLoaded}
      >
        {isLoaded ? sample.label : "Loading..."}
      </button>
    </div>
  );
};

export default DrumPad;
