"use client";
import { useState, useEffect } from "react";
import * as Tone from "tone";
import { Circle, Play, Square, Music3 } from "lucide-react";
import { useAudioContext } from "../contexts/AudioContext";

const metronomeSynth = new Tone.Synth({
  oscillator: { type: "square" },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
}).toDestination();

// const metronomeOtherBeats = new Tone.Synth({
//   oscillator: { type: "square" },
//   envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
// }).toDestination();

const Transport = () => {
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [loopLength, setLoopLength] = useState<number>(2);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState<number>(120);
  const { isRecording, setIsRecording } = useAudioContext();

  const transport = Tone.Transport;
  transport.timeSignature = timeSignature[0];

  // Metronome synths

  useEffect(() => {
    let beatCount = 0;

    const metronomeLoop = transport.scheduleRepeat((time) => {
      if (!isPlaying || !metronomeActive) return;

      // Get the current beat position within the measure
      const [bars, beats] = transport.position.split(":").map(Number);
      beatCount = beats % timeSignature[0];

      if (beatCount === 0) {
        metronomeSynth.triggerAttackRelease("C6", "8n", time); // Fire on every downbeat
      } else {
        metronomeSynth.triggerAttackRelease("G5", "8n", time);
      }
    }, `${timeSignature[1]}n`); // Fire on every beat except the downbeat

    return () => {
      transport.clear(metronomeLoop);
    };
  }, [isPlaying, metronomeActive, timeSignature]);

  useEffect(() => {
    transport.bpm.value = bpm;
  }, [bpm]);

  // Function to toggle metronome without restarting beat count
  const handleToggleMetronome = () => {
    setMetronomeActive((prev) => !prev);
  };

  useEffect(() => {
    transport.loop = true;
    transport.loopStart = "0:0:0"; // always start loop at 0
    transport.loopEnd = `${loopLength}:0:0`;
  }, [loopLength]);

  // Funciton to toggle isRecording
  const handleToggleRecord = () => {
    setIsRecording((prev) => !prev);
  };

  const handlePlay = async () => {
    if (isPlaying) return;
    await Tone.start(); // Ensure audio context is unlocked
    transport.start();
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (!isPlaying) return;
    transport.stop();
    setIsPlaying(false);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Transport Controls */}
      <div className="grid grid-cols-4 gap-3 border border-black p-2 rounded-lg shadow-md">
        <Play
          fill={isPlaying ? "green" : "white"}
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

      {/* BPM Controls */}
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
          className="w-16 p-1 border border-gray-400 rounded-md text-center"
        />
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full cursor-pointer"
        />
      </div>

      {/* Time Signature Controls */}
      <div className="flex items-center gap-2">
        <label htmlFor="time-signature" className="text-lg font-semibold">
          Time Signature:
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={timeSignature[0]}
            onChange={(e) =>
              setTimeSignature([Number(e.target.value), timeSignature[1]])
            }
            className="w-12 p-1 border border-gray-400 rounded-md text-center"
          />
          <span className="text-lg font-bold">/</span>
          <input
            type="number"
            value={timeSignature[1]}
            onChange={(e) =>
              setTimeSignature([timeSignature[0], Number(e.target.value)])
            }
            className="w-12 p-1 border border-gray-400 rounded-md text-center"
          />
          <label htmlFor="loop-length" className="text-lg font-semibold">
            Loop Length:
          </label>
          <input
            type="number"
            value={loopLength}
            onChange={(e) => setLoopLength(Number(e.target.value))}
            className="w-12 p-1 border border-gray-400 rounded-md text-center"
          />
        </div>
      </div>
    </div>
  );
};

export default Transport;
