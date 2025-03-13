"use client";
import { useState, useEffect } from "react";
import * as Tone from "tone";
import { Circle, Play, Square, Music3 } from "lucide-react";
import { useAudioContext } from "../contexts/AudioContext";

const metronomeSynth = new Tone.Synth({
  oscillator: { type: "square" },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
}).toDestination();

const Transport = () => {
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [loopLength, setLoopLength] = useState<number>(2);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [bpm, setBpm] = useState<number>(120);
  const {
    transport,
    isPlaying,
    setIsPlaying,
    isRecording,
    setIsRecording,
    quantizeActive,
    setQuantizeActive,
    quantizeValue,
    setQuantizeValue,
    allSampleData,
  } = useAudioContext();

  useEffect(() => {
    transport.current.timeSignature = timeSignature[0];
  }, [timeSignature, transport]);

  useEffect(() => {
    let beatCount = 0;

    const metronomeLoop = transport.current.scheduleRepeat((time) => {
      if (!isPlaying || !metronomeActive) return;

      const [, beats] = transport.current.position.split(":").map(Number);
      beatCount = beats % timeSignature[0];

      if (beatCount === 0) {
        metronomeSynth.triggerAttackRelease("C6", "8n", time);
      } else {
        metronomeSynth.triggerAttackRelease("G5", "8n", time);
      }
    }, `${timeSignature[1]}n`);

    const transportForCleanup = transport.current;

    return () => {
      transportForCleanup.clear(metronomeLoop);
    };
  }, [isPlaying, metronomeActive, timeSignature, transport]);

  useEffect(() => {
    transport.current.bpm.value = bpm;
  }, [bpm, transport]);

  useEffect(() => {
    transport.current.loop = true;
    transport.current.loopStart = "0:0:0";
    transport.current.loopEnd = `${loopLength}:0:0`;
  }, [loopLength, transport]);

  const handleToggleRecord = () => {
    setIsRecording((prev) => !prev);
  };

  const handlePlay = async () => {
    if (isPlaying) return;
    await Tone.start();
    transport.current.start();
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (!isPlaying) return;
    transport.current.stop();
    setIsPlaying(false);
  };

  const handleToggleMetronome = () => {
    setMetronomeActive((prev) => !prev);
  };

  const handleExportWav = async () => {
    const loopSeconds = transport.current.toSeconds(`${loopLength}m`);
    // Pass `allSampleData` into the export function for offline rendering
    await exportWAV(allSampleData, loopSeconds, 1);
  };

  return (
    <div className="border rounded-sm border-slate-300 shadow-md shadow-zinc-400 p-4 flex flex-col items-center space-y-4">
      {/* Transport Controls - Narrower Width */}
      <div className="w-fit mx-auto grid grid-cols-4 gap-3 border border-black p-2 rounded-lg shadow-md">
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

      {/* BPM & Time Signature - Wider & Centered */}
      <div className="w-full max-w-2xl flex justify-between gap-8">
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
          className="w-12 p-1 border border-gray-400 rounded-md text-center"
        />
        <label htmlFor="quantize-active" className="text-lg font-semibold">
          Quantization:
        </label>
        <input
          type="checkbox"
          name="quantize-active"
          id="quantize-active"
          checked={quantizeActive}
          onChange={(e) => setQuantizeActive(e.target.checked)}
        />
        <select
          value={quantizeValue}
          onChange={(e) => setQuantizeValue(Number(e.target.value))}
          className="w-16 p-1 border border-gray-400 rounded-md text-center bg-white"
        >
          {[1, 4, 8, 16].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button onClick={handleExportWav} className="border border-black">
          Download
        </button>
      </div>
    </div>
  );
};

export default Transport;
