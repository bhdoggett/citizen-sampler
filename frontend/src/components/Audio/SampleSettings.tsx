"use client";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useState, useEffect, useCallback } from "react";
import type { SampleSettingsFE } from "src/types/audioTypesFE";
import useMutesAndSolos from "../../app/hooks/useMutesAndSolos";
import Waveform from "./Waveform";
import notes from "../../lib/notes";
import {
  linearizeFrequency,
  exponentiateFrequency,
} from "../../lib/audio/util/frequencyConversion";
import { useUIContext } from "../../app/contexts/UIContext";
import { QuantizeValue } from "@shared/types/audioTypes";

const SampleSettings = () => {
  const {
    selectedSampleId,
    allSampleData,
    setAllSampleData,
    samplersRef,
    updateSamplerStateSettings,
    currentLoop,
  } = useAudioContext();
  const { confirmActionRef, setShowDialog, setHotKeysActive } = useUIContext();

  // // Need Frequency Params for translating frequency filters from exponential to linear inputs
  // const maxFreq = 20000;

  const { setSampleMute, setSampleSolo } = useMutesAndSolos();

  const [settings, setSettings] = useState<Partial<SampleSettingsFE> | null>(
    null
  );
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
    value: SampleSettingsFE[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear recorded sample events from specified sampler
  const handleClearSampleEvents = () => {
    if (!selectedSampleId) return;
    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: {
        ...prev[selectedSampleId],
        events: {
          ...prev[selectedSampleId].events,
          [currentLoop]: [],
        },
      },
    }));
    setShowDialog(null);
    setHotKeysActive(true);
  };

  // Render Hz or kHz based on value
  const formatFrequency = (value: number | undefined) => {
    if (typeof value !== "number") return "20000 Hz";
    if (value > 9999) return `${(value / 1000).toFixed(1)} kHz`;
    return `${value.toFixed(0)} Hz`;
  };

  // initialize settings with selected sample's settings
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
      pitch.pitch = settings?.pitch || 0;
      panVol.volume.value = settings?.volume || 0;
      panVol.pan.value = settings?.pan || 0;
      highpass.frequency.value = settings?.highpass?.[0] || 0;
      lowpass.frequency.value = settings?.lowpass?.[0] || 200;
    },
    [samplersRef, settings]
  );

  // Keep samplersRef settings in sync with UI
  useEffect(() => {
    if (!settings) return;

    if (!selectedSampleId || !samplersRef.current[selectedSampleId]) return;
    updateSamplerRefSettings(selectedSampleId);

    // const samplerWithFX = samplersRef.current[selectedSampleId];
    // if (samplerWithFX) {
    //   const { sampler, pitch, panVol, highpass, lowpass } = samplerWithFX;
    //   pitch.pitch = settings.pitch || 0;
    //   panVol.volume.value = settings.volume || 0;
    //   panVol.pan.value = settings.pan || 0;
    //   highpass.frequency.value = settings.highpass?.[0] || 0;
    //   lowpass.frequency.value = settings.lowpass?.[0] || 20000;
    //   sampler.attack = settings.attack || 0;
    //   sampler.release = settings.release || 0;
    // }
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

  // if (!selectedSampleId) {
  //   return (
  //     <p className="text-center p-4">Select a sample to modify its settings</p>
  //   );
  // }

  if (!settings) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <div className="relative flex flex-col items-center border-2 shadow-md shadow-slate-500 border-black w-5/6">
        <div className="absolute flex shadow-inner shadow-slate-500 overflow-hidden text-xs -mx-0.5">
          <h1 className={"px-2 bg-black text-white"}>
            {`${allSampleData[selectedSampleId].collectionName}`}
          </h1>
          <h1
            className={
              "px-2 border-b-2  shadow-inner shadow-slate-500 border-r-2 border-black text-black"
            }
          >
            {`${allSampleData[selectedSampleId].title}`}
          </h1>
        </div>

        <div className="mt-12 w-full">
          <div className="flex flex-col justify-center">
            <div className="flex justify-center w-full">
              <Waveform audioUrl={allSampleData[selectedSampleId].url} />
            </div>
            <div id="settings" className="p-2 mx-auto">
              <div className="flex gap-x-4 md:gap-x-6">
                <div className="flex flex-col">
                  <label className="mb-2 flex justify-between">
                    <span>Vol</span>
                    <span>{settings.volume?.toFixed(1) || "0.0"}</span>
                  </label>
                  <input
                    type="range"
                    min="-24"
                    max="6"
                    step="0.1"
                    value={settings.volume || 0}
                    onChange={(e) => {
                      updateSetting("volume", parseFloat(e.target.value));
                    }}
                    className="w-full slider slider"
                  />
                  <label className="mt-3 mb-2 flex justify-between">
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
                      updateSetting("pan", parseFloat(e.target.value))
                    }
                    className="w-full slider"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-2 flex justify-between">
                    <span>Att</span>
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
                    className="w-full slider"
                  />

                  <label className="mt-3 mb-2 flex justify-between">
                    <span>Rel</span>
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
                    className="w-full slider"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-2 flex justify-between">
                    <span>HP</span>
                    <span>{formatFrequency(settings.highpass?.[0])}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={linearizeFrequency(
                      settings.highpass?.[0] || 0
                    ).toFixed(2)}
                    onChange={(e) =>
                      updateSetting("highpass", [
                        exponentiateFrequency(parseFloat(e.target.value)),
                        "highpass",
                      ])
                    }
                    className="w-full slider"
                  />

                  <label
                    htmlFor="lowpass"
                    className="mt-3 mb-2 flex justify-between"
                  >
                    <span>LP</span>
                    <span>{formatFrequency(settings.lowpass?.[0])}</span>
                  </label>
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
                    className="w-full slider"
                  />
                </div>
                <div>
                  <div className="flex mt-2 mb-4">
                    <label className="" htmlFor="base-note">
                      Note
                    </label>
                    <select
                      value={settings.baseNote}
                      onChange={(e) => {
                        updateSetting("baseNote", e.target.value);
                      }}
                      className="w-12 border flex mx-auto border-gray-700 shadow-inner shadow-slate-800 text-center bg-white"
                    >
                      {notes.map((note) => (
                        <option key={note} value={note}>
                          {note}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label htmlFor="pitch" className="mt-3 flex justify-between">
                    <span>Pitch</span>
                    <span>{settings.pitch?.toFixed(1) || "0.0"}</span>
                  </label>
                  <input
                    name="pitch"
                    type="range"
                    min="-12"
                    max="12"
                    step="0.01"
                    value={settings.pitch || 0}
                    onChange={(e) => {
                      updateSetting("pitch", parseFloat(e.target.value));
                    }}
                    className="w-full slider slider"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="w-full max-w-2xl flex items-center gap-1 mb-2">
                    <button
                      onClick={() =>
                        updateSetting("quantize", !settings.quantize)
                      }
                      className={`border-2 border-black px-2 py-1 ${settings.quantize ? "bg-slate-600 text-white font-bold shadow-inner shadow-black" : "bg-slate-200 text-black shadow-sm shadow-slate-500"}`}
                    >
                      Quantize
                    </button>
                  </div>
                  <select
                    value={settings.quantVal}
                    onChange={(e) => {
                      updateSetting(
                        "quantVal",
                        Number(e.target.value) as QuantizeValue
                      );
                    }}
                    className="w-12 mb-3 border flex mx-auto border-gray-700 shadow-inner shadow-slate-800 text-center bg-white"
                  >
                    {[1, 4, 8, 16, 32].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-start">
                    <button
                      className={`border shadow-inner shadow-slate-600 border-black px-1 mx-1 ${isMuted ? "bg-red-600" : ""}`}
                      onClick={handleToggleMute}
                    >
                      M
                    </button>
                    <button
                      className={`border shadow-inner shadow-slate-600 border-black px-1 mx-1 ${isSoloed ? "bg-yellow-300" : ""}`}
                      onClick={handleToggleSolo}
                    >
                      S
                    </button>
                    <button
                      onClick={() => {
                        setShowDialog("choose-sample");
                      }}
                      className="border shadow-inner shadow-slate-600 border-black px-1 mx-1"
                    >
                      📂
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                confirmActionRef.current = {
                  message:
                    "This will clear all recorded play events for this sampler",
                  buttonText: "Okay",
                  action: handleClearSampleEvents,
                };
                setShowDialog("confirm-action");
              }}
              className="border border-black px-1 bg-slate-100 hover:bg-slate-300 shadow-inner shadow-slate-800 flex mx-auto text-xs"
            >
              Clear Recorded Events
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SampleSettings;
