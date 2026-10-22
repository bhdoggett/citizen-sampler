"use client";
import { useEffect } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useUIContext } from "src/app/contexts/UIContext";
import LoopProgressBar from "./LoopProgress";
import { useSelectLoop } from "src/app/hooks/useSelectLoop";

import type { LoopName, LoopSettings } from "../../types/audioTypes";
import styles from "./Loop.module.css";

const loops = ["A", "B", "C", "D"];

const Loop = () => {
  const { allLoopSettings, setAllLoopSettings, currentLoop, loopIsPlaying } =
    useAudioContext();
  const { setShowDialog, uiWarningMessageRef } = useUIContext();

  const handleSelectLoop = useSelectLoop();

  const updateLoopSetting = <K extends keyof LoopSettings>(
    key: K,
    value: LoopSettings[K]
  ) => {
    if (loopIsPlaying && (key === "beats" || key === "bars")) {
      uiWarningMessageRef.current =
        "Stop loop playback before updating beats or bars";
      setShowDialog("ui-warning");
      return;
    }
    setAllLoopSettings((prev) => ({
      ...prev,
      [currentLoop as LoopName]: {
        ...prev[currentLoop as LoopName],
        [key]: value,
      },
    }));
  };

  const thisLoopSettings = allLoopSettings[currentLoop as LoopName];

  // Sync BPM and swing — safe to update during playback
  useEffect(() => {
    if (!thisLoopSettings) return;
    const transport = Tone.getTransport();
    transport.bpm.value = thisLoopSettings.bpm;
    transport.swing = thisLoopSettings.swing;
  }, [thisLoopSettings?.bpm, thisLoopSettings?.swing]);

  // Sync beats, bars, and loop boundaries — only when structural settings change
  useEffect(() => {
    if (!thisLoopSettings) return;
    const transport = Tone.getTransport();
    transport.timeSignature = thisLoopSettings.beats;
    transport.loop = true;
    transport.loopEnd = `${thisLoopSettings.bars}:0:0`;
  }, [thisLoopSettings?.beats, thisLoopSettings?.bars]);

  return (
    <div className={styles.loop}>
      <h2 className={styles.heading}>Loop</h2>
      <div className={styles.loopTabs}>
        {loops.map((loop) => (
          <button
            key={loop}
            className={`${styles.loopTab} ${loop === currentLoop ? styles.loopTabActive : ""}`}
            onClick={() => handleSelectLoop(loop as LoopName)}
            title={`Select loop ${loop} (Shift + ${loop})`}
          >
            {loop}
          </button>
        ))}
      </div>
      <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="bpm" className={styles.label}>
              BPM
            </label>
            <input
              id="bpm"
              type="number"
              min="40"
              max="240"
              value={allLoopSettings[currentLoop as LoopName]?.bpm ?? 120}
              onChange={(e) => updateLoopSetting("bpm", Number(e.target.value))}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="swing" className={styles.label}>
              Swing
            </label>
            <input
              id="swing"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={allLoopSettings[currentLoop as LoopName]?.swing ?? 0}
              onChange={(e) => updateLoopSetting("swing", Number(e.target.value))}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="beats" className={styles.label}>
              Beats
            </label>
            <input
              id="beats"
              type="number"
              min="1"
              max="32"
              value={allLoopSettings[currentLoop as LoopName]?.beats ?? 4}
              onChange={(e) => updateLoopSetting("beats", Number(e.target.value))}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="bars" className={styles.label}>
              Bars
            </label>
            <input
              id="bars"
              type="number"
              min="1"
              max="32"
              value={allLoopSettings[currentLoop as LoopName]?.bars ?? 1}
              onChange={(e) => updateLoopSetting("bars", Number(e.target.value))}
              className={styles.input}
            />
          </div>
      </div>
      <LoopProgressBar />
    </div>
  );
};

export default Loop;
