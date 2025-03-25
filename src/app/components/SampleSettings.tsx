"use client";
import { useAudioContext } from "../contexts/AudioContext";
import { useState, useEffect, use } from "react";
import type { SampleSettings, SampleType } from "../types/SampleType";

const SampleSettings = () => {
  // const audioCtx = useAudioContext();

  // if (!audioCtx) return null;

  const {
    selectedSampleId,
    setAllSampleData,
    allSampleData,
    samplersRef,
    getSampleData,
    updateSamplerStateSettings,
    updateSamplerRefSettings,
  } = useAudioContext();

  // const [selectedSample, setSelectedSample] = useState<SampleType | null>(null);
  const [settings, setSettings] = useState<SampleSettings | null>(null);

  //test some things
  useEffect(() => {
    console.log("selectedSampleId", selectedSampleId);
    console.log("allSampleData", allSampleData);
  }, [selectedSampleId, allSampleData]);

  // useEffect(() => {
  //   if (selectedSampleId) {
  //     setSelectedSample(getSampleData(selectedSampleId));
  //     console.log("selectedSample", selectedSample);
  //   }
  // }, [selectedSampleId, getSampleData, selectedSample]);

  // initialize settings with selected sample's settings
  useEffect(() => {
    if (selectedSampleId) {
      setSettings(getSampleData(selectedSampleId).settings);
    }
  }, [selectedSampleId, getSampleData]);

  // Keep sampler settings in sync with UI
  useEffect(() => {
    if (settings) {
      const samplerWithFX = samplersRef.current[selectedSampleId];
      console.log("samplerWithFX", samplerWithFX);
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
  }, [samplersRef, selectedSampleId, settings]);

  // update allSampleData and samplerRef settings when settings change
  useEffect(() => {
    if (
      !selectedSampleId ||
      settings === allSampleData[selectedSampleId].settings
    )
      return;

    const handler = setTimeout(() => {
      // Update global state
      updateSamplerStateSettings(selectedSampleId, settings);

      // Update sampler instance for real-time feedback
      Object.entries(settings).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          updateSamplerRefSettings(selectedSampleId, key, value[0]);
        } else {
          updateSamplerRefSettings(selectedSampleId, key, value);
        }
      });
      console.log("settings", settings);
      console.log("all sample data", allSampleData);
    }, 500);

    return () => {
      clearTimeout(handler); // cancel if settings change before debounceDelay
    };
  }, [settings, updateSamplerStateSettings, updateSamplerRefSettings]);

  // update settings in this component's state
  const updateCurrentSampleSettings = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!selectedSampleId) {
    return (
      <p className="text-center p-4">Select a sample to modify its settings</p>
    );
  }

  if (!settings) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg max-w-md mx-auto my-4">
      <h3 className="text-lg font-semibold mb-4">
        Settings: {selectedSampleId}
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
            onChange={(e) =>
              updateCurrentSampleSettings("volume", parseFloat(e.target.value))
            }
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
            onChange={(e) =>
              updateCurrentSampleSettings("pan", parseFloat(e.target.value))
            }
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
              updateCurrentSampleSettings("attack", parseFloat(e.target.value))
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
              updateCurrentSampleSettings("release", parseFloat(e.target.value))
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
              updateCurrentSampleSettings("highpass", [
                parseFloat(e.target.value),
                "highpass",
              ])
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
              updateCurrentSampleSettings("lowpass", [
                parseFloat(e.target.value),
                "lowpass",
              ])
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
