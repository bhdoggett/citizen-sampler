"use client";
import { useAudioContext } from "../contexts/AudioContext";
import { useState, useEffect, use } from "react";
import type { SampleSettings } from "../types/SampleType";

const SampleSettings = () => {
  const {
    selectedSample,
    setAllSampleData,
    allSampleData,
    samplersRef,
    getSampleData,
    updateSampleSettings,
  } = useAudioContext();
  const [settings, setSettings] = useState(
    selectedSample ? selectedSample.settings : {}
  );
  // Keep sampler settings in sync with UI
  useEffect(() => {
    if (selectedSample && settings) {
      const samplerWithFX = samplersRef.current[selectedSample.id];
      if (samplerWithFX) {
        const { sampler, panVol, highpass, lowpass } = samplerWithFX;
        panVol.volume.value = settings.volume || 0;
        panVol.pan.value = settings.pan || 0;
        highpass.frequency.value = settings.highpass[0] || 0;
        lowpass.frequency.value = settings.lowpass[0] || 20000;
        sampler.attack = settings.attack || 0;
        sampler.release = settings.release || 0;
      }
    }
  }, [settings, selectedSample, samplersRef]);

  // useEffect(() => {
  //   if (selectedSample) {
  //     const updatedSample = getSampleData(selectedSample.id);
  //     if (updatedSample) {
  //       setSettings(updatedSample.settings);
  //     }
  //   }
  // }, [selectedSample, allSampleData, getSampleData]);

  useEffect(() => {
    if (selectedSample) {
      setSettings(selectedSample.settings);
    }
  }, [selectedSample]);

  const updateSettingForRender = (key: string, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // const updateFilterSetting = (filter: string, value: number) => {
  //   setSettings((prev) => ({
  //     ...prev,
  //     [filter]: [value, filter],
  //   }));
  // };

  // const saveSettings = () => {
  //   setAllSampleData((prevSamples) =>
  //     prevSamples.map((s) =>
  //       s.id === selectedSample.id ? { ...s, settings } : s
  //     )
  //   );
  // };

  if (!selectedSample) {
    return (
      <p className="text-center p-4">Select a sample to modify its settings</p>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg max-w-md mx-auto my-4">
      <h3 className="text-lg font-semibold mb-4">
        Settings: {selectedSample.title}
      </h3>

      <div className="space-y-4">
        <div className="flex flex-col">
          <label className="mb-2 flex justify-between">
            <span>Volume</span>
            <span>{settings.volume?.toFixed(1) || "0.0"} dB</span>
          </label>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.1"
            value={settings.volume || 0}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value);
              updateSettingForRender("volume", newValue);
              updateSampleSettings(selectedSample.id, "volume", newValue);
            }}
            className="w-full"
          />

          <label className="mb-2 mt-4 flex justify-between">
            <span>Pan</span>
            <span>{settings.pan?.toFixed(1) || "0.0"}</span>
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={settings.pan || 0}
            onChange={(e) => updateSetting("pan", parseFloat(e.target.value))}
            className="w-full"
          />

          <label className="mb-2 mt-4 flex justify-between">
            <span>Attack</span>
            <span>{settings.attack?.toFixed(2) || "0.00"} s</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={settings.attack || 0}
            onChange={(e) =>
              updateSetting("attack", parseFloat(e.target.value))
            }
            className="w-full"
          />

          <label className="mb-2 mt-4 flex justify-between">
            <span>Release</span>
            <span>{settings.release?.toFixed(2) || "0.00"} s</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={settings.release || 0}
            onChange={(e) =>
              updateSetting("release", parseFloat(e.target.value))
            }
            className="w-full"
          />

          <label className="mb-2 mt-4 flex justify-between">
            <span>Highpass</span>
            <span>{settings.highpass?.[0] || "0"} Hz</span>
          </label>
          <input
            type="range"
            min="0"
            max="2000"
            step="1"
            value={settings.highpass?.[0] || 0}
            onChange={(e) =>
              updateFilterSetting("highpass", parseFloat(e.target.value))
            }
            className="w-full"
          />

          <label className="mb-2 mt-4 flex justify-between">
            <span>Lowpass</span>
            <span>{settings.lowpass?.[0] || "20000"} Hz</span>
          </label>
          <input
            type="range"
            min="200"
            max="20000"
            step="1"
            value={settings.lowpass?.[0] || 20000}
            onChange={(e) =>
              updateFilterSetting("lowpass", parseFloat(e.target.value))
            }
            className="w-full"
          />
        </div>

        {/* <button
          onClick={saveSettings}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-6"
        >
          Save Settings
        </button> */}
      </div>
    </div>
  );
};

export default SampleSettings;
