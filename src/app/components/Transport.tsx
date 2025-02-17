"use client";
import { useState, useEffect } from "react";
import * as Tone from "tone";
import { Circle, Play, Square, Music3 } from "lucide-react";

const Transport = () => {
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [numBars, setNumBars] = useState<number>(2);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);

  const transport = Tone.getTransport();
  transport.bpm.value = bpm;
  transport.timeSignature = timeSignature[0];

  // Metronome synths
  const metronomeDownBeat = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();

  const metronomeOtherBeats = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();

  useEffect(() => {
    let beatCount = 0;

    const metronomeLoop = transport.scheduleRepeat((time) => {
      if (!isPlaying || !metronomeActive) return;

      // Get the current beat position within the measure
      const [bars, beats] = transport.position.split(":").map(Number);
      beatCount = beats % timeSignature[0];

      if (beatCount === 0) {
        metronomeDownBeat.triggerAttackRelease("C6", "8n", time); // Fire on every downbeat
      } else {
        metronomeOtherBeats.triggerAttackRelease("G5", "8n", time);
      }
    }, `${timeSignature[1]}n`); // Fire on every beat except the downbeat

    return () => {
      transport.clear(metronomeLoop);
    };
  }, [isPlaying, metronomeActive, timeSignature, transport.bpm]);

  // Function to toggle metronome without restarting beat count
  const handleToggleMetronome = () => {
    setMetronomeActive((prev) => !prev);
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
    <div className="grid grid-cols-4 gap-3 border rounded-none border-black outline-4">
      <Play
        fill={isPlaying ? "black" : "white"}
        className="hover:fill-slate-300"
        onClick={handlePlay}
      />
      <Square className="hover:fill-slate-300" onClick={handleStop} />
      <Circle className="hover:fill-slate-300" />
      <Music3
        fill={metronomeActive ? "black" : "white"}
        className="hover:fill-slate-300"
        onClick={handleToggleMetronome}
      />
    </div>
  );
};

export default Transport;
