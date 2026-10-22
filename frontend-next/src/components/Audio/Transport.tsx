"use client";
import { useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { Circle, Music3 } from "lucide-react";
import styles from "./Transport.module.css";
import { useAudioContext } from "../../app/contexts/AudioContext";
import type { LoopName } from "../../types/audioTypes";
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

  const loopSettingsRef = useRef(allLoopSettings);
  useEffect(() => {
    loopSettingsRef.current = allLoopSettings;
  }, [allLoopSettings]);

  const currentLoopRef = useRef(currentLoop);
  useEffect(() => {
    currentLoopRef.current = currentLoop;
  }, [currentLoop]);

  useEffect(() => {
    // beatsCount will increment to keep track of when down-beat or off-beat should play
    let beatCount = 0;

    const metronomeLoop = Tone.getTransport().scheduleRepeat((time) => {
      if (!loopIsPlaying || !metronomeRef.current) return;

      const [, beats] = (Tone.getTransport().position as string)
        .split(":")
        .map(Number);
      beatCount =
        beats %
        loopSettingsRef.current[currentLoopRef.current as LoopName]!.beats;

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
  }, [loopIsPlaying]);

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
