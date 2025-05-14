import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../app/contexts/AudioContext";
import DrumPad from "./DrumPad";
import PitchGrid from "./PitchGrid"; // ✅ import your PitchGrid component
import quantize from "../app/functions/quantize";

type SamplerId =
  | "loc-1"
  | "loc-2"
  | "loc-3"
  | "loc-4"
  | "loc-5"
  | "loc-6"
  | "loc-7"
  | "loc-8"
  | "kit-1"
  | "kit-2"
  | "kit-3"
  | "kit-4";

type SamplersPlayingState = {
  [key in SamplerId]: {
    isPlaying: boolean;
    note: string;
  };
};

type PartsRef = {
  [key in SamplerId]: Tone.Part;
};

const DrumMachine = () => {
  const {
    allSampleData,
    samplersRef,
    selectedSampleId,
    currentLoop,
    loopIsPlaying,
  } = useAudioContext();
  const [samplersLoaded, setSamplersLoaded] = useState(false);
  const [samplerCount, setSamplerCount] = useState(0);
  const [samplersPlaying, setSamplersPlaying] = useState<SamplersPlayingState>({
    "loc-1": { isPlaying: false, note: "C4" },
    "loc-2": { isPlaying: false, note: "C4" },
    "loc-3": { isPlaying: false, note: "C4" },
    "loc-4": { isPlaying: false, note: "C4" },
    "loc-5": { isPlaying: false, note: "C4" },
    "loc-6": { isPlaying: false, note: "C4" },
    "loc-7": { isPlaying: false, note: "C4" },
    "loc-8": { isPlaying: false, note: "C4" },
    "kit-1": { isPlaying: false, note: "C4" },
    "kit-2": { isPlaying: false, note: "C4" },
    "kit-3": { isPlaying: false, note: "C4" },
    "kit-4": { isPlaying: false, note: "C4" },
  });
  const partsRef = useRef<PartsRef | null>(null);

  // const currentSampleDataRef = useRef(allSampleData[selectedSampleId]);
  const [padsOrPitchGrid, setPadsOrPitchGrid] = useState<"pads" | "pitch-grid">(
    "pads"
  );

  const setSamplerIsPlayingFalse = (id: SamplerId) => {
    setSamplersPlaying((prev) => ({
      ...prev,
      [id]: { ...prev[id as SamplerId], isPlaying: false },
    }));
  };

  const setSamplerIsPlayingTrue = (id) => {
    setSamplersPlaying((prev) => ({
      ...prev,
      [id]: { ...prev[id as SamplerId], isPlaying: true },
    }));
  };

  const makeTonePart = (id) => {
    const sampleData = allSampleData[id];
    const sampler = samplersRef.current[id];

    if (allSampleData[id].events[currentLoop].length === 0) return;

    const events = sampleData.events[currentLoop].map((event) => {
      if (!event.startTime) return;
      const startTimeInSeconds = Tone.Ticks(event.startTime).toSeconds();
      const eventTime = sampleData.settings.quantize
        ? quantize(startTimeInSeconds, sampleData.settings.quantVal)
        : startTimeInSeconds;
      return [
        eventTime,
        {
          startTime: eventTime,
          duration: event.duration,
          note: event.note,
          // velocity: event.velocity,
        },
      ];
    });

    const part = new Tone.Part((time, event) => {
      const { start, end } = sampleDataRef.current.settings;
      if (
        typeof event === "object" &&
        event !== null &&
        "duration" in event &&
        event.duration !== null
      ) {
        const actualDuration = end
          ? end - start < event.duration
            ? end - start
            : event.duration
          : event.duration;
        sampler.triggerAttackRelease(event.note, actualDuration, time, start);
        setSamplerIsPlayingTrue(id);

        setTimeout(() => {
          setSamplerIsPlayingFalse(id);
        }, event.duration * 1000);
        console.log(event);
      }
    }, events);
  };
  useEffect(() => {
    if (!loopIsPlaying) return;

    Object.values(partsRef.current).forEach((part) => {
      part.start(0);
    });

    const disposeParts = () => {
      Object.values(partsRef.current).forEach((part) => {
        if (part.state === "started") {
          part.stop();
        }
        part.dispose();
      });
    };

    return () => {
      disposeParts();
    };
  }, [loopIsPlaying, allSampleData, selectedSampleId, currentLoop]);

  // const getSamplerPlayNote = (id) => {};

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
          samplerIsPlaying={samplersPlaying[id as SamplerId].isPlaying}
          setSamplerIsPlayingTrue={() =>
            setSamplerIsPlayingTrue(id as SamplerId)
          }
          setSamplerIsPlayingFalse={() =>
            setSamplerIsPlayingFalse(id as SamplerId)
          }
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
          onClick={() =>
            setPadsOrPitchGrid(
              padsOrPitchGrid === "pads" ? "pitch-grid" : "pads"
            )
          }
        >
          Switch to {padsOrPitchGrid === "pads" ? "Pitch Grid" : "Drum Pads"}
        </button>
      </div>

      {padsOrPitchGrid === "pads" ? (
        <>
          <div className="grid grid-cols-4 gap-0 my-3">
            {renderDrumPads("loc")}
          </div>
          <hr />
          <div className="grid grid-cols-4 gap-0 my-3">
            {renderDrumPads("kit")}
          </div>
        </>
      ) : (
        <PitchGrid id={selectedSampleId} />
      )}
    </div>
  );
};

export default DrumMachine;
