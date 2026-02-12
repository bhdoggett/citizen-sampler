"use client";
import { useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { Circle, Music3, Grid3X3 } from "lucide-react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import type { LoopName } from "@shared/types/audioTypes";
import { useUIContext } from "src/app/contexts/UIContext";

const Transport = () => {
  const {
    loopIsPlaying,
    setLoopIsPlaying,
    isRecording,
    setIsRecording,
    metronomeActive,
    setMetronomeActive,
    allLoopSettings,
    currentLoop,
  } = useAudioContext();

  const metronomeRef = useRef<Tone.Sampler | null>(null);
  const gainNodeRef = useRef<Tone.Gain | null>(null);

  useEffect(() => {
    metronomeRef.current = new Tone.Sampler({
      urls: { C6: "hi-block.wav", G5: "lo-block.wav" },
      baseUrl: "/samples/metronome/",
    });
    gainNodeRef.current = new Tone.Gain(0).toDestination();
    metronomeRef.current.connect(gainNodeRef.current);
  }, []);

  const handlePlay = useCallback(async () => {
    if (loopIsPlaying) return;
    await Tone.start();
    Tone.getTransport().start();
    setLoopIsPlaying(true);
  }, [loopIsPlaying, setLoopIsPlaying]);

  const handleRecord = useCallback(() => {
    setIsRecording((prev) => !prev);
    if (!loopIsPlaying) handlePlay();
  }, [loopIsPlaying, handlePlay, setIsRecording]);

  const handleStop = useCallback(() => {
    if (!loopIsPlaying) return;
    Tone.getTransport().stop();
    setLoopIsPlaying(false);
    setIsRecording(false);
  }, [loopIsPlaying, setLoopIsPlaying, setIsRecording]);

  const handleToggleMetronome = useCallback(() => {
    setMetronomeActive((prev) => !prev);
  }, [setMetronomeActive]);
  // Schedule metronome playback based on time signature

  useEffect(() => {
    if (!gainNodeRef.current) return;
    if (!metronomeActive) {
      gainNodeRef.current.gain.setValueAtTime(0, Tone.now());
    } else {
      gainNodeRef.current.gain.setValueAtTime(1, Tone.now());
    }
  }, [metronomeActive]);

  useEffect(() => {
    // beatsCount will increment to keep track of when down-beat or off-beat should play
    let beatCount = 0;

    const metronomeLoop = Tone.getTransport().scheduleRepeat((time) => {
      if (!loopIsPlaying || !metronomeRef.current) return;

      const [, beats] = (Tone.getTransport().position as string)
        .split(":")
        .map(Number);
      beatCount = beats % allLoopSettings[currentLoop as LoopName]!.beats;

      if (beatCount === 0) {
        metronomeRef.current.triggerAttackRelease("C6", "8n", time);
      } else {
        metronomeRef.current.triggerAttackRelease("G5", "8n", time);
      }
    }, "4n");

    const transportForCleanup = Tone.getTransport();

    return () => {
      transportForCleanup.clear(metronomeLoop);
    };
  }, [loopIsPlaying, allLoopSettings, currentLoop]);

  const { hotKeysActive, sequencerVisible, setSequencerVisible } =
    useUIContext();

  const handleToggleSequencer = useCallback(() => {
    setSequencerVisible((prev) => !prev);
  }, [setSequencerVisible]);
  // useTransportHotKeys(hotKeysActive);

  useEffect(() => {
    if (!hotKeysActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (loopIsPlaying) {
          handleStop();
        } else {
          handlePlay();
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleRecord();
      }
      if (e.key === "m") {
        handleToggleMetronome();
      }
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        handleToggleSequencer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handlePlay,
    handleRecord,
    handleStop,
    handleToggleMetronome,
    handleToggleSequencer,
    loopIsPlaying,
    hotKeysActive,
  ]);

  return (
    <div className="pl-1 mb-1">
      <div className="flex flex-col w-full mx-auto  shadow-md shadow-slate-500">
        <div className=" w-full flex justify-between items-center border-2 gap-1 border-black p-2 shadow-inner shadow-slate-500 bg-slate-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={loopIsPlaying ? "green" : "white"}
            stroke="currentColor"
            strokeWidth="2"
            className=" cursor-pointer mr-0.5"
            onClick={handlePlay}
          >
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          <Circle
            fill={isRecording ? "red" : "white"}
            className=" cursor-pointer mr-0.5"
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
            className="cursor-pointer"
            onClick={handleStop}
          >
            <rect width="18" height="18" x="3" y="3" />
          </svg>
          <Music3
            fill={metronomeActive ? "black" : "white"}
            className="cursor-pointer"
            onClick={handleToggleMetronome}
          />
          <Grid3X3
            fill={sequencerVisible ? "black" : "white"}
            className="cursor-pointer"
            onClick={handleToggleSequencer}
          />
        </div>
      </div>
    </div>
  );
};

export default Transport;
