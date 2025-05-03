"use client";
import useDownloadWavStems from "../hooks/useDownloadWavStems";

const MasterSettings = () => {
  const handleDownloadStems = useDownloadWavStems();
  return (
    <div className="flex flex-col mx-auto w-96">
      <span className="flex mx-auto text-xs">This doesn't work yet...</span>
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
