"use client";
import { useEffect } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import LoopProgressBar from "./LoopProgress";
import { useSelectLoop } from "src/app/hooks/useSelectLoop";

import type { LoopName, LoopSettings } from "@shared/types/audioTypes";

const loops = ["A", "B", "C", "D"];

const Loop = () => {
  const { allLoopSettings, setAllLoopSettings, currentLoop, loopIsPlaying } =
    useAudioContext();
  const { setShowDialog, uiWarningMessageRef } = useUIContext();

  const handleSelectLoop = useSelectLoop();

  const updateLoopSetting = <K extends keyof LoopSettings>(
    key: K,
    value: LoopSettings[K]
  ) => {
    if (loopIsPlaying && (key === "beats" || key === "bars")) {
      uiWarningMessageRef.current =
        "Stop loop playback before updating beats or bars";
      setShowDialog("ui-warning");
      return;
    }
    setAllLoopSettings((prev) => ({
      ...prev,
      [currentLoop as LoopName]: {
        ...prev[currentLoop as LoopName],
        [key]: value,
      },
    }));
  };

  const thisLoopSettings = allLoopSettings[currentLoop as LoopName];

  // Sync BPM and swing — safe to update during playback
  useEffect(() => {
    if (!thisLoopSettings) return;
    const transport = Tone.getTransport();
    transport.bpm.value = thisLoopSettings.bpm;
    transport.swing = thisLoopSettings.swing;
  }, [thisLoopSettings?.bpm, thisLoopSettings?.swing]);

  // Sync beats, bars, and loop boundaries — only when structural settings change
  useEffect(() => {
    if (!thisLoopSettings) return;
    const transport = Tone.getTransport();
    transport.timeSignature = thisLoopSettings.beats;
    transport.loop = true;
    transport.loopEnd = `${thisLoopSettings.bars}:0:0`;
  }, [thisLoopSettings?.beats, thisLoopSettings?.bars]);

  return (
    <div className="flex flex-col pl-1">
      <div className="flex flex-col w-full mx-auto border-2 border-black shadow-md shadow-slate-500">
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
              onClick={() => handleSelectLoop(loop as LoopName)}
              title={`Select loop ${loop} (Shift + ${loop})`}
            >
              {loop}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 w-full max-w-sm p-1 text-sm font-semibold">
          <div className="flex-1 flex items-center">
            <label htmlFor="bpm" className="">
              BPM:
            </label>
            <input
              id="bpm"
              type="number"
              min="40"
              max="240"
              value={allLoopSettings[currentLoop as LoopName]?.bpm ?? 120}
              onChange={(e) => updateLoopSetting("bpm", Number(e.target.value))}
              className="w-16 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>
          <div className="flex-1 flex items-center">
            <label htmlFor="swing" className="">
              Swing:
            </label>
            <input
              id="swing"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={allLoopSettings[currentLoop as LoopName]?.swing ?? 0}
              onChange={(e) =>
                updateLoopSetting("swing", Number(e.target.value))
              }
              className="w-16 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>

          {/* Time Signature Controls */}
          <div className="flex-1 flex items-center">
            <label htmlFor="beats" className="">
              Beats:
            </label>
            <input
              id="beats"
              type="number"
              min="1"
              max="32"
              value={allLoopSettings[currentLoop as LoopName]?.beats ?? 4}
              onChange={(e) =>
                updateLoopSetting("beats", Number(e.target.value))
              }
              className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>

          <div className="flex-1 flex items-center">
            <label htmlFor="bars" className="">
              Bars:
            </label>
            <input
              id="bars"
              type="number"
              min="1"
              max="32"
              value={allLoopSettings[currentLoop as LoopName]?.bars ?? 1}
              onChange={(e) =>
                updateLoopSetting("bars", Number(e.target.value))
              }
              className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>
        </div>
        <LoopProgressBar />
      </div>
    </div>
  );
};

export default Loop;
