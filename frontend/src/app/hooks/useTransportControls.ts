"use client";
import { useEffect, useRef, useCallback } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import type { LoopName } from "@shared/types/audioTypes";
import * as Tone from "tone";

// This sets up hotkeys for stop, play, record and metronome
const useTransportControls = () => {
  const {
    loopIsPlaying,
    setLoopIsPlaying,
    setIsRecording,
    metronomeActive,
    setMetronomeActive,
    allLoopSettings,
    currentLoop,
  } = useAudioContext();

  const metronomeRef = useRef(
    (() => {
      const metronomeSampler = new Tone.Sampler({
        urls: { C6: "hi-block.wav", G5: "lo-block.wav" },
        baseUrl: "/samples/metronome/",
      });
      const gainNode = new Tone.Gain(0).toDestination();
      metronomeSampler.connect(gainNode);
      return {
        metronomeSampler,
        gainNode,
      };
    })()
  );

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
    if (!metronomeActive) {
      metronomeRef.current.gainNode.gain.setValueAtTime(0, Tone.now());
    } else {
      metronomeRef.current.gainNode.gain.setValueAtTime(1, Tone.now());
    }
  }, [metronomeActive]);

  useEffect(() => {
    // beatsCount will increment to keep track of when down-beat or off-beat should play
    let beatCount = 0;

    const metronomeLoop = Tone.getTransport().scheduleRepeat((time) => {
      if (!loopIsPlaying) return;

      const [, beats] = (Tone.getTransport().position as string)
        .split(":")
        .map(Number);
      beatCount = beats % allLoopSettings[currentLoop as LoopName]!.beats;

      if (beatCount === 0) {
        metronomeRef.current.metronomeSampler.triggerAttackRelease(
          "C6",
          "8n",
          time
        );
      } else {
        metronomeRef.current.metronomeSampler.triggerAttackRelease(
          "G5",
          "8n",
          time
        );
      }
    }, "4n");

    const transportForCleanup = Tone.getTransport();

    return () => {
      transportForCleanup.clear(metronomeLoop);
    };
  }, [loopIsPlaying, allLoopSettings, currentLoop]);

  return { handlePlay, handleStop, handleRecord, handleToggleMetronome };
};

export default useTransportControls;
