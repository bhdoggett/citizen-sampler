"use client";
import { useCallback } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";

// This sets up hotkeys for stop, play, record and metronome
const useTransportControls = () => {
  const {
    loopIsPlaying,
    setLoopIsPlaying,
    setIsRecording,
    setMetronomeActive,
  } = useAudioContext();

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

  return { handlePlay, handleStop, handleRecord, handleToggleMetronome };
};

export default useTransportControls;
