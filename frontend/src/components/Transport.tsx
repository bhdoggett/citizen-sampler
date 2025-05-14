"use client";
import { useEffect } from "react";
import { Circle, Music3 } from "lucide-react";
import { useAudioContext } from "../app/contexts/AudioContext";
import useTransportControls from "../app/hooks/useTransportControls";
import * as Tone from "tone";

const Transport = () => {
  const {
    metronomeActive,
    bars,
    setBars,
    beatsPerBar,
    setBeatsPerBar,
    bpm,
    setBpm,
    loopIsPlaying,
    isRecording,
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
          <div className="flex gap-2">
            <input
              type="number"
              value={beatsPerBar}
              onChange={(e) => setBeatsPerBar(Number(e.target.value))}
              className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
            />
          </div>
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

export default Transport;
