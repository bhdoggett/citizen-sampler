"use client";
import useDownloadWavStems from "../hooks/useDownloadWavStems";

const MasterSettings = () => {
  const handleDownloadStems = useDownloadWavStems();
  return (
    <div className="w-96">
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
