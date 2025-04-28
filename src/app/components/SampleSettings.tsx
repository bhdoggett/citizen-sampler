"use client";
import { useAudioContext } from "../contexts/AudioContext";
import { useState, useEffect, use } from "react";
import type { SampleSettings, SampleType } from "../types/SampleTypes";
import useMutesAndSolos from "../hooks/useMutesAndSolos";
import ChooseSample from "./ChooseSample";

const SampleSettings = () => {
  const {
    selectedSampleId,
    setAllSampleData,
    allSampleData,
    samplersRef,
    updateSamplerStateSettings,
    updateSamplerRefSettings,
  } = useAudioContext();

  const { setSampleMute, setSampleSolo } = useMutesAndSolos();

  const [settings, setSettings] = useState<SampleSettings | null>(null);
  const [isSoloed, setIsSoloed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // combine local and global state updates into one function for event listener
  const toggleSolo = () => {
    if (isSoloed) {
      setSampleSolo(selectedSampleId, false);
      setIsSoloed(false);
    } else {
      setSampleSolo(selectedSampleId, true);
      setIsSoloed(true);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setSampleMute(selectedSampleId, false);
      setIsMuted(false);
    } else {
      setSampleMute(selectedSampleId, true);
      setIsMuted(true);
    }
  };

  // initialize settings with selected sample's settings
  useEffect(() => {
    if (selectedSampleId && allSampleData[selectedSampleId]) {
      setSettings(allSampleData[selectedSampleId].settings);
    }
  }, [selectedSampleId, allSampleData]);

  // Keep samplersRef settings in sync with UI
  useEffect(() => {
    if (settings) {
      const samplerWithFX = samplersRef.current[selectedSampleId];
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

  // Keep mute and solo rendering in sync with global state
  useEffect(() => {
    if (selectedSampleId && allSampleData[selectedSampleId]) {
      setIsMuted(allSampleData[selectedSampleId].settings.mute);
      setIsSoloed(allSampleData[selectedSampleId].settings.solo);
    }
  }, [selectedSampleId, allSampleData]);

  // update allSampleData when settings change
  useEffect(() => {
    if (
      !selectedSampleId ||
      !allSampleData[selectedSampleId] ||
      settings === allSampleData[selectedSampleId].settings
    )
      return;

    const handler = setTimeout(() => {
      updateSamplerStateSettings(selectedSampleId, settings);
    }, 50);

    return () => {
      clearTimeout(handler); // cancel if settings change before debounceDelay
    };
  }, [
    selectedSampleId,
    allSampleData,
    settings,
    updateSamplerStateSettings,
    updateSamplerRefSettings,
  ]);

  // update settings in this component's state by setting type
  const updateCurrentSampleSettings = <K extends keyof SampleSettings>(
    key: K,
    value: SampleSettings[K]
  ) => {
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

  // Need Frequency Params for translating frequency filters from exponential to linear inputs
  const minFreq = 20;
  const maxFreq = 20000;

  // Convert from frequency (Hz) to a 0-1 linear slider value
  const linearizeFrequency = (frequency: number): number => {
    return Math.log(frequency / minFreq) / Math.log(maxFreq / minFreq);
  };

  // Convert from slider (0-1) back to frequency (Hz)
  const exponentiateFrequency = (sliderValue: number): number => {
    return minFreq * Math.pow(maxFreq / minFreq, sliderValue);
  };

  return (
    <>
      <ChooseSample />
      <div className="p-2 mx-auto mb-3">
        {/* <h3 className="text-lg font-semibold mb-4">
      Settings: {allSampleData[selectedSampleId].title}
    </h3> */}
        <div className="flex gap-x-4 md:gap-x-6">
          <div className="flex flex-col">
            <label className="my-2 flex justify-between">
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
                updateCurrentSampleSettings(
                  "volume",
                  parseFloat(e.target.value)
                );
              }}
              className="w-full slider slider"
            />

            <label className="my-2 flex justify-between">
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
              className="w-full slider"
            />
          </div>
          <div className="flex flex-col">
            <label className="my-2 flex justify-between">
              <span>Attack</span>
              <span>{settings.attack?.toFixed(2) || "0.00"} s</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.01"
              value={settings.attack || 0}
              onChange={(e) =>
                updateCurrentSampleSettings(
                  "attack",
                  parseFloat(e.target.value)
                )
              }
              className="w-full slider"
            />

            <label className="my-2 flex justify-between">
              <span>Release</span>
              <span>{settings.release?.toFixed(2) || "0.00"} s</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.01"
              value={settings.release || 0}
              onChange={(e) =>
                updateCurrentSampleSettings(
                  "release",
                  parseFloat(e.target.value)
                )
              }
              className="w-full slider"
            />
          </div>
          <div className="flex flex-col">
            <label className="my-2 flex justify-between">
              <span>Highpass</span>
              <span>{settings.highpass?.[0].toFixed(0) || "0"} Hz</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={linearizeFrequency(settings.highpass?.[0] || 20).toFixed(
                2
              )}
              onChange={(e) =>
                updateCurrentSampleSettings("highpass", [
                  exponentiateFrequency(parseFloat(e.target.value)),
                  "highpass",
                ])
              }
              className="w-full slider"
            />

            <label className="my-2 flex justify-between">
              <span>Lowpass</span>
              <span>{settings.lowpass?.[0].toFixed(0) || "20000"} Hz</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={linearizeFrequency(settings.lowpass?.[0] || 20)}
              onChange={(e) =>
                updateCurrentSampleSettings("lowpass", [
                  exponentiateFrequency(parseFloat(e.target.value)),
                  "lowpass",
                ])
              }
              className="w-full slider"
            />
          </div>
          <div className="flex flex-col">
            <div className="w-full max-w-2xl flex items-center gap-4">
              <label htmlFor="quantize-active" className="my-2">
                Quantize:
              </label>
              <input
                type="checkbox"
                name="quantize-active"
                id="quantize-active"
                checked={settings.quantize}
                onChange={(e) => {
                  updateCurrentSampleSettings("quantize", e.target.checked);
                  console.log(
                    `allSampleData[${selectedSampleId}]`,
                    allSampleData[selectedSampleId]
                  );

                  // setQuantizeActive(e.target.checked)
                }}
              />
            </div>
            <select
              value={settings.quantVal}
              onChange={(e) => {
                updateCurrentSampleSettings("quantVal", Number(e.target.value));

                // setQuantizeValue(Number(e.target.value))
              }}
              className="w-16 p-1 border border-gray-700 shadow-inner shadow-slate-800 text-center bg-white"
            >
              {[1, 4, 8, 16].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex m-1">
              <button
                className={`border rounded-sm border-black mx-1 p-1 ${isMuted ? "bg-red-600" : "bg-slate-400"}`}
                onClick={toggleMute}
              >
                M
              </button>
              <button
                className={`border rounded-sm border-black mx-1 p-1 ${isSoloed ? "bg-yellow-300" : "bg-slate-400"}`}
                onClick={toggleSolo}
              >
                S
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SampleSettings;
