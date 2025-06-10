"use client";
import { Circle, Music3 } from "lucide-react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import useTransportHotKeys from "src/app/hooks/useTransportHotKeys";
import useTransportControls from "../../app/hooks/useTransportControls";
import { useUIContext } from "src/app/contexts/UIContext";

const Transport = () => {
  const { loopIsPlaying, isRecording, metronomeActive } = useAudioContext();

  const { handlePlay, handleStop, handleRecord, handleToggleMetronome } =
    useTransportControls();
  const { hotKeysActive } = useUIContext();
  useTransportHotKeys(hotKeysActive);

  return (
    <div className="pl-1 mb-1">
      <div className="flex flex-col w-full mx-auto  shadow-md shadow-slate-500">
        <div className=" w-full flex justify-between items-center border-2 gap-1 border-black p-2 shadow-inner shadow-slate-500 bg-slate-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={loopIsPlaying ? "green" : "white"}
            stroke="currentColor"
            strokeWidth="2"
            className="hover:fill-slate-300 cursor-pointer mr-0.5"
            onClick={handlePlay}
          >
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          <Circle
            fill={isRecording ? "red" : "white"}
            className="hover:fill-slate-300 cursor-pointer mr-0.5"
            onClick={handleRecord}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            stroke="currentColor"
            strokeWidth="2"
            className="hover:fill-slate-300 cursor-pointer"
            onClick={handleStop}
          >
            <rect width="18" height="18" x="3" y="3" />
          </svg>
          <Music3
            fill={metronomeActive ? "black" : "white"}
            className="hover:fill-slate-300 cursor-pointer"
            onClick={handleToggleMetronome}
          />
        </div>
      </div>
    </div>
  );
};

export default Transport;
