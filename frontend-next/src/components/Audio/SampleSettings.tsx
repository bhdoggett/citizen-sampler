"use client";
import { useAudioContext } from "../../app/contexts/AudioContext";
import type { ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import type { SampleSettingsFE } from "src/types/audioTypesFE";
import useMutesAndSolos from "../../app/hooks/useMutesAndSolos";
import Waveform from "./Waveform";
import notes from "../../lib/notes";
import {
  linearizeFrequency,
  exponentiateFrequency,
} from "../../lib/audio/util/frequencyConversion";
import { useUIContext } from "../../app/contexts/UIContext";
import { QuantizeValue } from "../../types/audioTypes";
import { usePitchDetector } from "../../app/hooks/usePitchDetector";
import PitchMeter from "./PitchMeter";
import { usePad } from "src/lib/song/react";
import styles from "./SampleSettings.module.css";

const SampleSettings = () => {
  const { selectedSampleId, updateSamplerStateSettings } = useAudioContext();
  const { openDialog } = useUIContext();
  const pad = usePad(selectedSampleId);
  const { settings } = pad;

  const { setSampleMute, setSampleSolo } = useMutesAndSolos();
  const pitchResult = usePitchDetector(selectedSampleId, settings.pitch ?? 0);
  const isSoloed = settings.solo;
  const isMuted = settings.mute;

  const handleToggleSolo = () => setSampleSolo(selectedSampleId, !isSoloed);
  const handleToggleMute = () => setSampleMute(selectedSampleId, !isMuted);

  // Edits go straight to the song; the engine applies them as it follows,
  // and saving to localStorage is debounced there
  const updateSetting = <K extends keyof SampleSettingsFE>(
    key: K,
    value: SampleSettingsFE[K],
  ) => {
    updateSamplerStateSettings(selectedSampleId, { [key]: value });
  };

  // Render Hz or kHz based on value
  const formatFrequency = (value: number | undefined) => {
    if (typeof value !== "number") return "20000 Hz";
    if (value > 9999) return `${(value / 1000).toFixed(1)} kHz`;
    return `${value.toFixed(0)} Hz`;
  };

  return (
    <section className={styles.panel}>
      <div className={styles.source}>
        <span className={styles.collection}>
          {pad.collectionName}
        </span>
        <span className={styles.title}>
          {pad.title}
        </span>
        <button
          onClick={() => {
            openDialog({ type: "choose-sample" });
          }}
          className={styles.chooseSample}
          title="Choose sample"
          aria-label="Choose sample"
        >
          <FolderOpen size={12} strokeWidth={2} />
        </button>
      </div>

      <Waveform audioUrl={pad.url} />

      <div id="settings" className={styles.controls}>
        <div className={styles.column}>
          <Control label="Vol" value={settings.volume?.toFixed(1) || "0.0"}>
            <input
              type="range"
              min="-24"
              max="6"
              step="0.1"
              value={settings.volume || 0}
              onChange={(e) => {
                updateSetting("volume", parseFloat(e.target.value));
              }}
              className="slider"
            />
          </Control>
          <Control label="Pan" value={settings.pan?.toFixed(1) || "0.0"}>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={settings.pan || 0}
              onChange={(e) => updateSetting("pan", parseFloat(e.target.value))}
              className="slider"
            />
          </Control>
        </div>

        <div className={styles.column}>
          <Control
            label="Att"
            value={`${settings.attack?.toFixed(2) || "0.00"} s`}
          >
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={settings.attack || 0}
              onChange={(e) =>
                updateSetting("attack", parseFloat(e.target.value))
              }
              className="slider"
            />
          </Control>
          <Control
            label="Rel"
            value={`${settings.release?.toFixed(2) || "0.00"} s`}
          >
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={settings.release || 0}
              onChange={(e) =>
                updateSetting("release", parseFloat(e.target.value))
              }
              className="slider"
            />
          </Control>
        </div>

        <div className={styles.column}>
          <Control label="HP" value={formatFrequency(settings.highpass?.[0])}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={linearizeFrequency(settings.highpass?.[0] || 0).toFixed(
                2,
              )}
              onChange={(e) =>
                updateSetting("highpass", [
                  exponentiateFrequency(parseFloat(e.target.value)),
                  "highpass",
                ])
              }
              className="slider"
            />
          </Control>
          <Control label="LP" value={formatFrequency(settings.lowpass?.[0])}>
            <input
              type="range"
              name="lowpass"
              min="0"
              max="1"
              step="0.001"
              value={linearizeFrequency(settings.lowpass?.[0] || 0)}
              onChange={(e) =>
                updateSetting("lowpass", [
                  exponentiateFrequency(parseFloat(e.target.value)),
                  "lowpass",
                ])
              }
              className="slider"
            />
          </Control>
        </div>

        <div className={styles.column}>
          <Control label="Note">
            <select
              id="base-note"
              value={settings.baseNote}
              onChange={(e) => {
                updateSetting("baseNote", e.target.value);
                e.target.blur();
              }}
              onKeyDown={(e) => {
                e.preventDefault();
                e.currentTarget.blur();
              }}
              className={styles.select}
            >
              {notes.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
            <PitchMeter pitch={pitchResult} />
          </Control>
          <Control
            label="Pitch"
            value={((settings.pitch || 0) * 100).toFixed(0)}
          >
            <input
              name="pitch"
              type="range"
              min="-0.5"
              max="0.5"
              step="0.01"
              value={settings.pitch || 0}
              onChange={(e) => {
                updateSetting("pitch", parseFloat(e.target.value));
              }}
              className="slider"
            />
          </Control>
        </div>

        <div className={styles.column}>
          <Control label="Quantize" group>
            <div className={`${styles.strip} ${styles.stripFill}`}>
              <button
                onClick={() => updateSetting("quantize", !settings.quantize)}
                className={`${styles.toggle} ${styles.quantizeToggle} ${settings.quantize ? styles.toggleOn : ""}`}
                title="Toggle quantize (Shift + Q)"
              >
                {settings.quantize ? "ON" : "OFF"}
              </button>
              <select
                value={settings.quantVal}
                onChange={(e) => {
                  updateSetting("quantVal", e.target.value as QuantizeValue);
                }}
                className={styles.select}
                title="Quantize grid"
              >
                {QUANTIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    1/{option}
                  </option>
                ))}
              </select>
            </div>
          </Control>
          <Control label="Pad" group>
            <div className={styles.strip}>
              <button
                className={`${styles.toggle} ${isMuted ? styles.toggleMute : ""}`}
                onClick={handleToggleMute}
                title="Mute"
              >
                M
              </button>
              <button
                className={`${styles.toggle} ${isSoloed ? styles.toggleSolo : ""}`}
                onClick={handleToggleSolo}
                title="Solo"
              >
                S
              </button>
            </div>
            <div className={styles.strip}>
              <button
                className={`${styles.toggle} ${settings.oneShot ? styles.toggleOn : ""}`}
                onClick={() => updateSetting("oneShot", !settings.oneShot)}
                title="One shot — always play full clip"
              >
                1S
              </button>
              <button
                className={`${styles.toggle} ${settings.reverse ? styles.toggleOn : ""}`}
                onClick={() => updateSetting("reverse", !settings.reverse)}
                title="Reverse playback"
              >
                REV
              </button>
            </div>
          </Control>
        </div>
      </div>
    </section>
  );
};

type ControlProps = {
  label: string;
  value?: string;
  // Render as a div when the body holds several buttons, since a <label>
  // forwards clicks on its text to the first button inside it.
  group?: boolean;
  children: ReactNode;
};

// Every control is a header line over a fixed-height body, so the two rows
// line up across columns whatever the body contains.
const Control = ({ label, value, group, children }: ControlProps) => {
  const Root = group ? "div" : "label";
  return (
    <Root className={styles.control}>
      <span className={styles.controlHeader}>
        <span className={styles.label}>{label}</span>
        {value !== undefined && <span className={styles.value}>{value}</span>}
      </span>
      <span className={styles.controlBody}>{children}</span>
    </Root>
  );
};

const QUANTIZE_OPTIONS: QuantizeValue[] = [
  "1",
  "1t",
  "2",
  "2t",
  "4",
  "4t",
  "8",
  "8t",
  "16",
  "16t",
  "32",
  "32t",
];

export default SampleSettings;
