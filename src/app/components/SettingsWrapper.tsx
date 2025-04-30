"use client";
import { useState } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import useMutesAndSolos from "../hooks/useMutesAndSolos";
import SampleSettings from "./SampleSettings";
import Transport from "./Transport";
import MasterSettings from "./MasterSettings";

type settingsWindow = "sample" | "loop" | "master";

const SettingsWrapper = () => {
  const [settingsShown, setSettingShown] = useState<settingsWindow>("loop");
  const { clearSolos } = useMutesAndSolos();
  const { solosExist } = useAudioContext();

  return (
    <>
      <button
        className={`border rounded-sm border-black mx-1 p-1 ${solosExist ? "bg-yellow-300" : "bg-slate-400"}`}
        onClick={clearSolos}
      >
        S
      </button>
      <div className="flex flex-col items-center border border-black shadow-md shadow-slate-500">
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
          {settingsShown === "loop" && <Transport />}
          {settingsShown === "master" && <MasterSettings />}
        </div>
      </div>
    </>
  );
};

export default SettingsWrapper;
