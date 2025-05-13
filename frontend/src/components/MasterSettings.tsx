"use client";
import * as Tone from "tone";
import useDownloadWavStems from "../app/hooks/useDownloadWavStems";
import { useAudioContext } from "../app/contexts/AudioContext";

const MasterSettings = () => {
  const downloadWavs = useDownloadWavStems();
  const { songTitle } = useAudioContext();

  const handleDownloadStems = () => {
    downloadWavs();
    Tone.start();
  };

  return (
    <div className="flex flex-col mx-auto w-96">
      <span className="flex mx-auto text-xs">{songTitle}</span>
      <button
        className="flex mx-auto border border-black my-2 px-1"
        onClick={handleDownloadStems}
      >
        Download Stems
      </button>
    </div>
  );
};

export default MasterSettings;
