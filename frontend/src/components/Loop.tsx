"use client";
import { useEffect } from "react";
import { Circle, Music3 } from "lucide-react";
import { useAudioContext } from "../app/contexts/AudioContext";
import useTransportControls from "../app/hooks/useTransportControls";
import * as Tone from "tone";
import type { LoopName } from "@shared/types/audioTypes";

const loops = ["A", "B", "C", "D"];

const Loop = () => {
  const {
    metronomeActive,
    bars,
    setBars,
    beatsPerBar,
    setBeatsPerBar,
    bpm,
    setBpm,
    loopIsPlaying,
    allLoopSettings,
    isRecording,
    currentLoop,
    handleSelectLoop,
  } = useAudioContext();

  // Get the transport
  const transport = Tone.getTransport();

  const { handlePlay, handleStop, handleRecord, handleToggleMetronome } =
    useTransportControls();

  // Update ToneJS Transport bpm setting
  useEffect(() => {
    transport.bpm.value = bpm;
  }, [bpm, transport]);

  // Update Tone.js timeSignature when beatsPerBar changes;
  useEffect(() => {
    transport.timeSignature = beatsPerBar;
  }, [transport, beatsPerBar]);

  // Update ToneJS Transport loop length
  useEffect(() => {
    transport.loop = true;
    transport.loopStart = "0:0:0";
    transport.loopEnd = `${bars}:0:0`;
  }, [bars, transport]);

  // Keep allLoopSettingsRef in sync with UI
  useEffect(() => {
    allLoopSettings.current[currentLoop as LoopName] = {
      bpm,
      beats: beatsPerBar,
      bars,
    };
  }, [allLoopSettings, bpm, beatsPerBar, bars, currentLoop]);

  return (
    <div className="px-2 pb-2 flex flex-col items-center space-y-4">
      {/* Transport Controls - Narrower Width */}
      <div className="w-fit mx-auto grid grid-cols-4 gap-3 border border-black p-2 shadow-inner shadow-slate-500 bg-slate-200 ">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={loopIsPlaying ? "green" : "white"}
          stroke="currentColor"
          strokeWidth="2"
          // stroke-linecap="round"
          // stroke-linejoin="round"
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handlePlay}
        >
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
        {/* <Play
          fill={loopIsPlaying ? "green" : "white"}
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handlePlay}
        /> */}
        <Circle
          fill={isRecording ? "red" : "white"}
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleRecord}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="white"
          stroke="currentColor"
          strokeWidth="2"
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleStop}
        >
          <rect width="18" height="18" x="3" y="3" />
        </svg>
        {/* <Square
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleStop}
        /> */}
        <Music3
          fill={metronomeActive ? "black" : "white"}
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleToggleMetronome}
        />
      </div>

      <div className="flex w-full mx-auto border p-2">
        <div className="flex mr-3">
          {loops.map((loop) => (
            <button
              key={loop}
              className={`px-1 border-black hover:bg-slate-400 ${
                loop !== "D"
                  ? "border-t border-l border-b border-black px-1"
                  : "border border-black px-1"
              } ${loop === currentLoop ? "bg-slate-400 shadow-inner shadow-black" : "bg-slate-300"}`}
              onClick={() => handleSelectLoop(loop as LoopName)}
            >
              {loop}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center">
          <label htmlFor="bpm" className="text-lg font-semibold">
            BPM:
          </label>
          <input
            id="bpm"
            type="number"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-16 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
          />
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full mx-2 cursor-pointer slider"
          />
        </div>

        {/* Time Signature Controls */}
        <div className="flex-1 flex items-center">
          <label htmlFor="time-signature" className="text-lg font-semibold">
            Beats:
          </label>
          <input
            type="number"
            value={beatsPerBar}
            onChange={(e) => setBeatsPerBar(Number(e.target.value))}
            className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
          />
        </div>

        <div className="flex-1 items-center">
          <label htmlFor="loop-length" className="text-lg font-semibold">
            Bars:
          </label>
          <input
            type="number"
            value={bars}
            onChange={(e) => setBars(Number(e.target.value))}
            className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
          />
        </div>
      </div>

      {/* Quantization Settings - Third Line */}
    </div>
  );
};

export default Loop;
