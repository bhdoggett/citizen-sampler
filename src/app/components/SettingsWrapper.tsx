"use client";
import { useState } from "react";
import SampleSettings from "./SampleSettings";
import Transport from "./Transport";

type settingsWindow = "sample" | "loop" | "master";

const SettingsWrapper = () => {
  const [settingsShown, setSettingShown] = useState<settingsWindow>("loop");

  return (
    <div className="flex flex-col items-center border border-black shadow-inner shadow-slate-800">
      <div className="flex shadow-md shadow-slate-500 border border-black overflow-hidden mx-auto">
        <button
          className={`px-2 border border-black ${settingsShown === "sample" ? "bg-black text-white" : ""}`}
          onClick={() => setSettingShown("sample")}
        >
          Sample
        </button>
        <button
          className={`px-4 border border-black ${settingsShown === "loop" ? "bg-black text-white" : ""}`}
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
        {/* {settingsShown === "master" && <MasterSettings />} */}
      </div>
    </div>
  );
};

export default SettingsWrapper;
