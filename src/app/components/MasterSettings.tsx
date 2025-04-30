"use client";
import useDownloadWavStems from "../hooks/useDownloadWavStems";

const MasterSettings = () => {
  const handleDownloadStems = useDownloadWavStems();
  return (
    <div>
      <button onClick={handleDownloadStems}>sDownload Stesm</button>
    </div>
  );
};

export default MasterSettings;
