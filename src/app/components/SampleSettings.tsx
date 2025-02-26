"use client";
import { useAudioContext } from "../context/AudioProvider";
import { useState } from "react";

const SampleSettings = ({ sampleId }) => {
  const { allSampleData, setAllSampleData } = useAudioContext();
  const sample = allSampleData.find((s) => s.id === sampleId);

  const [settings, setSettings] = useState(sample ? sample.settings : {});

  if (!sample) {
    return <p>Sample not found.</p>;
  }

  const updateSetting = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const saveSettings = () => {
    setAllSampleData((prevSamples) =>
      prevSamples.map((s) => (s.id === sampleId ? { ...s, settings } : s))
    );
  };

  return (
    <div>
      <h3>Editing Settings for {sample.title}</h3>
      <label>
        Gain:
        <input
          type="number"
          value={settings.main.gain}
          onChange={(e) =>
            updateSetting("main", "gain", parseFloat(e.target.value))
          }
        />
      </label>
      <label>
        Pan:
        <input
          type="number"
          value={settings.main.pan}
          onChange={(e) =>
            updateSetting("main", "pan", parseFloat(e.target.value))
          }
        />
      </label>
      <button onClick={saveSettings}>Save</button>
    </div>
  );
};

export default SampleSettings;
