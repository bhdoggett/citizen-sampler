"use client";
import { useEffect } from "react";
import useTransportControls from "./useTransportControls";
import { useAudioContext } from "../contexts/AudioContext";

const useHotKeys = () => {
  const {
    loopIsPlaying,
    setLoopIsPlaying,
    isRecording,
    setIsRecording,
    setMetronomeActive,
  } = useAudioContext();

  const { handlePlay, handleStop, handleRecord, handleToggleMetronome } =
    useTransportControls();

  // Add event listeners for "hot keys"
  // spacebar = play/stop
  // "command r" =  toggle record
  // "m" = toggle metronome
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (loopIsPlaying) {
          handleStop();
        } else {
          handlePlay();
        }
      }
      if (e.key === "r" && e.metaKey) {
        e.preventDefault();
        handleRecord();
      }
      if (e.key === "m") {
        handleToggleMetronome();
        console.log("i'm pressing m now");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    loopIsPlaying,
    setLoopIsPlaying,
    isRecording,
    setIsRecording,
    handlePlay,
    handleStop,
    handleRecord,
    setMetronomeActive,
    handleToggleMetronome,
  ]);
};

export default useHotKeys;
