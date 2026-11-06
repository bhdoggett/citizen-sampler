"use client";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useLoops } from "src/lib/song/react";
import { useUIContext } from "src/app/contexts/UIContext";
import LoopProgressBar from "./LoopProgress";
import { useHostContext } from "src/lib/engine/react";
import { useSelectLoop } from "src/app/hooks/useSelectLoop";

import type { LoopSettings } from "../../types/audioTypes";
import { LOOP_NAMES } from "src/lib/constants/loops";
import { DEFAULT_LOOP_TIMING } from "src/lib/audio/defaults";
import styles from "./Loop.module.css";

const Loop = () => {
  const { setAllLoopSettings, currentLoop, loopIsPlaying } = useAudioContext();
  const allLoopSettings = useLoops();
  const { openDialog } = useUIContext();
  const host = useHostContext();
  const hostTempo = host.isPlugin ? host.tempo : null;

  const handleSelectLoop = useSelectLoop();

  const updateLoopSetting = <K extends keyof LoopSettings>(
    key: K,
    value: LoopSettings[K]
  ) => {
    if (loopIsPlaying && (key === "beats" || key === "bars")) {
      openDialog({
        type: "ui-warning",
        message: "Stop loop playback before updating beats or bars",
      });
      return;
    }
    setAllLoopSettings((prev) => ({
      ...prev,
      [currentLoop]: {
        ...prev[currentLoop],
        [key]: value,
      },
    }));
  };

  return (
    <div className={styles.loop}>
      <h2 className={styles.heading}>Loop</h2>
      <div className={styles.loopTabs}>
        {LOOP_NAMES.map((loop) => (
          <button
            key={loop}
            className={`${styles.loopTab} ${loop === currentLoop ? styles.loopTabActive : ""}`}
            onClick={() => handleSelectLoop(loop)}
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
              value={
                hostTempo !== null
                  ? Math.round(hostTempo * 100) / 100
                  : (allLoopSettings[currentLoop]?.bpm ?? DEFAULT_LOOP_TIMING.bpm)
              }
              readOnly={hostTempo !== null}
              title={hostTempo !== null ? "Follows your DAW's tempo" : undefined}
              onChange={(e) => {
                if (hostTempo !== null) return;
                updateLoopSetting("bpm", Number(e.target.value));
              }}
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
              value={allLoopSettings[currentLoop]?.swing ?? DEFAULT_LOOP_TIMING.swing}
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
              value={allLoopSettings[currentLoop]?.beats ?? DEFAULT_LOOP_TIMING.beats}
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
              value={allLoopSettings[currentLoop]?.bars ?? DEFAULT_LOOP_TIMING.bars}
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
