"use client";
import { useEffect } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import * as Tone from "tone";
import type { LoopName, LoopSettings } from "@shared/types/audioTypes";

const loops = ["A", "B", "C", "D"];

const Loop = () => {
  const {
    allLoopSettings,
    setAllLoopSettings,
    currentLoop,
    setCurrentLoop,
    // handleSelectLoop,
  } = useAudioContext();

  // test currentLoop in state
  useEffect(() => {
    console.log("current Loop", currentLoop);
  }, [currentLoop, setCurrentLoop]);

  const updateLoopSetting = <K extends keyof LoopSettings>(
    key: K,
    value: LoopSettings[K]
  ) => {
    setAllLoopSettings((prev) => ({
      ...prev,
      [currentLoop as LoopName]: {
        ...prev[currentLoop as LoopName],
        [key]: value,
      },
    }));
  };

  // Update ToneJS Transport settings when state changes
  useEffect(() => {
    const thisLoopSettings = allLoopSettings[currentLoop as LoopName];
    if (!thisLoopSettings) return;
    const { bpm, beats, bars, swing } = thisLoopSettings;
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    transport.swing = swing;
    transport.timeSignature = beats;
    transport.loop = true;
    transport.loopEnd = `${bars}:0:0`;
  }, [allLoopSettings, currentLoop]);

  return (
    <div className="px-2 pb-2 flex flex-col items-center space-y-4">
      <div className="flex flex-col w-full mx-auto  border-2 border-black">
        <h1 className="w-full border-b border-black bg-slate-800 text-white text-center">
          Loop
        </h1>
        <div className="flex border-b border-black mb-1">
          {loops.map((loop) => (
            <button
              key={loop}
              className={`flex-1 hover:bg-slate-400 font-bold ${
                loop !== "D" ? "border-r border-black" : ""
              } ${loop === currentLoop ? "bg-slate-400 shadow-inner shadow-black" : "bg-slate-300"}`}
              onClick={() => setCurrentLoop(loop as LoopName)}
            >
              {loop}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 w-full max-w-sm p-1 mb-1 text-sm font-semibold">
          <div className="flex-1 flex items-center ">
            <label htmlFor="bpm" className="">
              BPM:
            </label>
            <input
              id="bpm"
              type="number"
              min="40"
              max="240"
              value={allLoopSettings[currentLoop as LoopName]?.bpm}
              onChange={(e) => updateLoopSetting("bpm", Number(e.target.value))}
              className="w-16 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>
          <div className="flex-1 flex items-center">
            <label htmlFor="bpm" className="">
              Swing:
            </label>
            <input
              id="bpm"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={allLoopSettings[currentLoop as LoopName]?.swing}
              onChange={(e) =>
                updateLoopSetting("swing", Number(e.target.value))
              }
              className="w-16 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>

          {/* Time Signature Controls */}
          <div className="flex-1 flex items-center">
            <label htmlFor="time-signature" className="">
              Beats:
            </label>
            <input
              type="number"
              min="1"
              max="32"
              value={allLoopSettings[currentLoop as LoopName]?.beats}
              onChange={(e) =>
                updateLoopSetting("beats", Number(e.target.value))
              }
              className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>

          <div className="flex-1 items-center">
            <label htmlFor="loop-length" className="">
              Bars:
            </label>
            <input
              type="number"
              min="1"
              max="32"
              value={allLoopSettings[currentLoop as LoopName]?.bars}
              onChange={(e) =>
                updateLoopSetting("bars", Number(e.target.value))
              }
              className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loop;
