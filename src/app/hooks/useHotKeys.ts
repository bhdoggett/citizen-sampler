"use client";
import { useEffect } from "react";
import useTransportControls from "./useTransportControls";
import { useAudioContext } from "../contexts/AudioContext";

const useHotKeys = () => {
  const { loopIsPlaying } = useAudioContext();

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
      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleRecord();
      }
      if (e.key === "m") {
        handleToggleMetronome();
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
    loopIsPlaying,
  ]);
};

export default useHotKeys;
