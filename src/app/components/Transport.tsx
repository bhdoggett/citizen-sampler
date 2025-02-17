"use client";
import { useState, useEffect } from "react";
import * as Tone from "tone";
import { Circle, Play, Square, Music3 } from "lucide-react";
import { useAudioContext } from "../contexts/AudioContext";

const Transport = () => {
  const [metronomeActive, setMetronomeActive] = useState<boolean>(false);
  const [timeSignature, setTimeSignature] = useState<number[]>([4, 4]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState(120);

const handleBpmChange = (newBpm) => {
  setBpm(newBpm);
  transport.bpm.value = newBpm;
};
  const loop = Tone.Loop;

  const transport = Tone.getTransport();

  // Create a synth for the metronome click
  const metronomeDownBeat = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();

  const metronomeOtherBeats = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();

  // Schedule the metronome tick
  transport.scheduleRepeat((time) => {
    if (!isPlaying) {
      return;
    }

    if (metronomeActive) {
      metronomeDownBeat.triggerAttackRelease("C6", "1n", time);
    }
  }, "1n");

  useEffect(() => {
    let beatCount = 0;

    transport.scheduleRepeat((time) => {
      if (!isPlaying) {
        return;
      }

      if (metronomeActive) {
        beatCount = (beatCount + 1) % timeSignature[0]; // Loop beat count from 0 to 3

        if (beatCount !== 0) {
          metronomeOtherBeats.triggerAttackRelease("G5", "8n", time);
        }
      }
    }, `${timeSignature[1]}n`);
  }, [
    isPlaying,
    metronomeActive,
    timeSignature,
    transport.bpm,
    metronomeDownBeat,
    metronomeOtherBeats,
    transport,
  ]);

  // Function to start the metronome
  const handleToggleMetronome = () => setMetronomeActive((prev) => !prev);

  const handlePlay = () => {
    if (isPlaying) {
      return;
    }
    transport.start();
    setIsPlaying(true);
    console.log("Play started, isPlaying state is:", isPlaying);
  };

  const handleStop = () => {
    if (!isPlaying) {
      return;
    }
    transport.stop();
    setIsPlaying(false);
    console.log("play stopped, isPlaying State is:", isPlaying);
  };

  return (
    <div className="grid grid-cols-4 gap-3 border rounded-none border-black outline-4">
      <Play
        fill={isPlaying ? "black" : "white"}
        className="hover:fill-slate-300"
        onClick={handlePlay}
      />
      <Square className="hover:fill-slate-300" onClick={handleStop} />
      <Circle className="hover:fill-slate-300" />
      <Music3
        fill={!metronomeActive ? "white" : "black"}
        className="hover:fill-slate-300"
        onClick={handleToggleMetronome}
      />
    </div>
  );
};

export default Transport;
