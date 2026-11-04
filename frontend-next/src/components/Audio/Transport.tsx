"use client";
import { useEffect, useState, useCallback } from "react";
import { Circle, Music3 } from "lucide-react";
import styles from "./Transport.module.css";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import { useEngine } from "src/lib/engine/react";

const Transport = () => {
  const { loopIsPlaying, isRecording } = useAudioContext();
  const engine = useEngine();
  const [metronomeActive, setMetronomeActive] = useState(false);

  useEffect(() => {
    engine.send({ type: "setMetronome", on: metronomeActive });
  }, [engine, metronomeActive]);

  const handlePlay = useCallback(async () => {
    if (loopIsPlaying) return;
    await engine.start();
    engine.send({ type: "play" });
  }, [engine, loopIsPlaying]);

  const handleRecord = useCallback(() => {
    engine.send({ type: "setRecording", on: !isRecording });
    if (!loopIsPlaying) handlePlay();
  }, [engine, isRecording, loopIsPlaying, handlePlay]);

  // Stopping also ends recording
  const handleStop = useCallback(() => {
    if (!loopIsPlaying) return;
    engine.send({ type: "stop" });
  }, [engine, loopIsPlaying]);

  const handleToggleMetronome = useCallback(() => {
    setMetronomeActive((prev) => !prev);
  }, []);

  const { hotKeysActive } = useUIContext();

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
    hotKeysActive,
  ]);

  return (
    <div className={styles.transport}>
      <button
        className={`${styles.button} ${loopIsPlaying ? styles.playing : ""}`}
        onClick={handlePlay}
        title="Play (Space)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      </button>
      <button
        className={`${styles.button} ${isRecording ? styles.recording : ""}`}
        onClick={handleRecord}
        title="Record (Ctrl + R)"
      >
        <Circle size={20} strokeWidth={2} />
      </button>
      <button className={styles.button} onClick={handleStop} title="Stop (Space)">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect width="16" height="16" x="4" y="4" />
        </svg>
      </button>
      <button
        className={`${styles.button} ${metronomeActive ? styles.metronomeOn : ""}`}
        onClick={handleToggleMetronome}
        title="Metronome (M)"
      >
        <Music3 size={20} strokeWidth={2} />
      </button>
    </div>
  );
};

export default Transport;
