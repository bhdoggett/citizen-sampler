"use client";
import { useState, useEffect } from "react";
import * as Tone from "tone";
import { Circle, Play, Square, Music3 } from "lucide-react";
import { useAudioContext } from "../contexts/AudioContext";

const Transport = () => {
  const {
    transport,
    metronomeActive,
    setMetronomeActive,
    metronome,
    loopLength,
    setLoopLength,
    beatsPerBar,
    setBeatsPerBar,
    bpm,
    setBpm,
    loopIsPlaying,
    setLoopIsPlaying,
    isRecording,
    setIsRecording,
  } = useAudioContext();

  // test some things
  useEffect(() => {
    console.log("loop length", loopLength);
  }, [loopLength]);

  // Update ToneJS Transport bpm setting
  useEffect(() => {
    transport.current.bpm.value = bpm;
  }, [bpm, transport]);

  // Update Tone.js timeSignature when beatsPerBar changes;
  useEffect(() => {
    transport.current.timeSignature = beatsPerBar;
  }, [transport, beatsPerBar]);

  // Update ToneJS Transport loop length
  useEffect(() => {
    transport.current.loop = true;
    transport.current.loopStart = "0:0:0";
    transport.current.loopEnd = `${loopLength}:0:0`;
  }, [loopLength, transport]);

  const handleToggleRecord = () => {
    setIsRecording((prev) => !prev);
  };

  const handlePlay = async () => {
    if (loopIsPlaying) return;
    await Tone.start();
    transport.current.start();
    setLoopIsPlaying(true);
  };

  const handleStop = () => {
    if (!loopIsPlaying) return;
    transport.current.stop();
    setLoopIsPlaying(false);
  };

  const handleToggleMetronome = () => {
    setMetronomeActive((prev) => !prev);
  };

  return (
    <div className="px-2 pb-2 flex flex-col items-center space-y-4">
      {/* Transport Controls - Narrower Width */}
      <div className="w-fit mx-auto grid grid-cols-4 gap-3 border border-black p-2 shadow-inner shadow-slate-500">
        <Play
          fill={loopIsPlaying ? "green" : "white"}
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handlePlay}
        />
        <Square
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleStop}
        />
        <Circle
          fill={isRecording ? "red" : "white"}
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleToggleRecord}
        />
        <Music3
          fill={metronomeActive ? "black" : "white"}
          className="hover:fill-slate-300 cursor-pointer"
          onClick={handleToggleMetronome}
        />
      </div>
      <div className="w-full max-w-2xl flex justify-between gap-8">
        <div className="flex items-center gap-4">
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
            className="w-full cursor-pointer slider"
          />
        </div>

        {/* Time Signature Controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="time-signature" className="text-lg font-semibold">
            Beats per measure:
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
      </div>

      {/* Quantization Settings - Third Line */}
      <div className="w-full max-w-2xl flex items-center gap-4">
        <label htmlFor="loop-length" className="text-lg font-semibold">
          Loop Length:
        </label>
        <input
          type="number"
          value={loopLength}
          onChange={(e) => setLoopLength(Number(e.target.value))}
          className="w-12 p-1 border border-gray-400 text-center shadow-inner shadow-slate-500"
        />
      </div>
    </div>
  );
};

export default Transport;
