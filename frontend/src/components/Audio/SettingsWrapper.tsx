"use client";
import { useState } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import useMutesAndSolos from "../../app/hooks/useMutesAndSolos";
import SampleSettings from "./../Audio/SampleSettings";
import Loop from "./../Audio/Loop";

type settingsWindow = "sample" | "loop" | "master";

const SettingsWrapper = () => {
  const [settingsShown, setSettingShown] = useState<settingsWindow>("loop");
  const { clearSolos } = useMutesAndSolos();
  const { solosExist, isRecording } = useAudioContext();

  return (
    <>
      <div
        className={`relative flex flex-col items-center border-2 shadow-md shadow-slate-500 ${isRecording ? "border-red-600" : "border-black"}`}
      >
        <button
          className={`absolute top-1 left-1 border shadow-inner shadow-slate-500 border-black px-1 ${solosExist ? "bg-yellow-200" : ""}`}
          onClick={clearSolos}
        >
          S
        </button>
        <div className="flex shadow-inner shadow-slate-500 border border-black overflow-hidden mx-auto">
          <button
            className={`px-2 border-black ${settingsShown === "sample" ? "bg-black text-white" : ""}`}
            onClick={() => setSettingShown("sample")}
          >
            Sample
          </button>
          <button
            className={`px-4 border-black ${settingsShown === "loop" ? "bg-black text-white" : ""}`}
            onClick={() => setSettingShown("loop")}
          >
            Loop
          </button>
          <button
            className={`px-2 ${settingsShown === "master" ? "bg-black text-white" : ""}`}
            onClick={() => setSettingShown("master")}
          >
            Master
          </button>
        </div>

        <div className="mt-4 w-full">
          {settingsShown === "sample" && <SampleSettings />}
          {settingsShown === "loop" && <Loop />}
        </div>
      </div>
    </>
  );
};

export default SettingsWrapper;
