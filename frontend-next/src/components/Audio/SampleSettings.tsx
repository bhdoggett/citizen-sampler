"use client";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useState, useEffect, useCallback } from "react";
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
import styles from "./SampleSettings.module.css";

const SampleSettings = () => {
  const {
    selectedSampleId,
    allSampleData,
    samplersRef,
    updateSamplerStateSettings,
  } = useAudioContext();
  const { setShowDialog } = useUIContext();

  const { setSampleMute, setSampleSolo } = useMutesAndSolos();

  const analyser = samplersRef.current[selectedSampleId]?.analyser ?? null;

  const [settings, setSettings] = useState<Partial<SampleSettingsFE> | null>(
    null,
  );

  const pitchResult = usePitchDetector(analyser, settings?.pitch ?? 0);
  const [isSoloed, setIsSoloed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // combine local and global state updates into one function for event listener
  const handleToggleSolo = () => {
    if (isSoloed) {
      setSampleSolo(selectedSampleId, false);
      setIsSoloed(false);
    } else {
      setSampleSolo(selectedSampleId, true);
      setIsSoloed(true);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setSampleMute(selectedSampleId, false);
      setIsMuted(false);
    } else {
      setSampleMute(selectedSampleId, true);
      setIsMuted(true);
    }
  };

  // Update settings in this component's state by setting type
  const updateSetting = <K extends keyof SampleSettingsFE>(
    key: K,
    value: SampleSettingsFE[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Render Hz or kHz based on value
  const formatFrequency = (value: number | undefined) => {
    if (typeof value !== "number") return "20000 Hz";
    if (value > 9999) return `${(value / 1000).toFixed(1)} kHz`;
    return `${value.toFixed(0)} Hz`;
  };

  // Initialize settings with selected sample's settings
  useEffect(() => {
    if (selectedSampleId && allSampleData[selectedSampleId]) {
      setSettings(allSampleData[selectedSampleId].settings);
    }
  }, [selectedSampleId, allSampleData]);

  const updateSamplerRefSettings = useCallback(
    (id: string) => {
      if (!samplersRef.current[id]) return;
      const samplerWithFX = samplersRef.current[id];
      if (!samplerWithFX) return;
      const { sampler, pitch, panVol, highpass, lowpass } = samplerWithFX;
      sampler.attack = settings?.attack || 0;
      sampler.release = settings?.release || 0;
      sampler.setReverse(settings?.reverse ?? false);
      pitch.pitch = settings?.pitch || 0;
      panVol.volume.value = settings?.volume || 0;
      panVol.pan.value = settings?.pan || 0;
      highpass.frequency.value = settings?.highpass?.[0] || 0;
      lowpass.frequency.value = settings?.lowpass?.[0] || 200;
    },
    [samplersRef, settings],
  );

  // Keep samplersRef settings in sync with UI
  useEffect(() => {
    if (!settings) return;

    if (!selectedSampleId || !samplersRef.current[selectedSampleId]) return;
    updateSamplerRefSettings(selectedSampleId);
  }, [samplersRef, selectedSampleId, settings, updateSamplerRefSettings]);

  // Keep mute and solo rendering in sync with global state
  useEffect(() => {
    if (selectedSampleId && allSampleData[selectedSampleId]) {
      const { mute, solo } = allSampleData[selectedSampleId].settings;
      setIsMuted(mute);
      setIsSoloed(solo);
    }
  }, [selectedSampleId, allSampleData]);

  // update allSampleData when settings change
  useEffect(() => {
    if (
      !selectedSampleId ||
      !allSampleData[selectedSampleId] ||
      settings === allSampleData[selectedSampleId].settings ||
      settings === null
    )
      return;

    const handler = setTimeout(() => {
      updateSamplerStateSettings(selectedSampleId, settings);
    }, 500);

    return () => {
      clearTimeout(handler); // cancel if settings change before debounceDelay
    };
  }, [selectedSampleId, allSampleData, settings, updateSamplerStateSettings]);

  if (!settings) {
    return <p>Loading...</p>;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.source}>
        <span className={styles.collection}>
          {allSampleData[selectedSampleId].collectionName}
        </span>
        <span className={styles.title}>
          {allSampleData[selectedSampleId].title}
        </span>
        <button
          onClick={() => {
            setShowDialog("choose-sample");
          }}
          className={styles.chooseSample}
          title="Choose sample"
          aria-label="Choose sample"
        >
          <FolderOpen size={12} strokeWidth={2} />
        </button>
      </div>

      <Waveform audioUrl={allSampleData[selectedSampleId].url} />

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
