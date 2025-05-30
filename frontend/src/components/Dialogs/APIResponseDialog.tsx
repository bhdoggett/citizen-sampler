"use client";
import { useUIContext } from "frontend/src/app/contexts/UIContext";

const APIResponseDialog: React.FC = () => {
  const { apiResponseMessageRef } = useUIContext();

  return (
    <>
      <h2 className="text-center text-lg font-bold mb-3">
        {apiResponseMessageRef.current}
      </h2>
    </>
  );
};

export default APIResponseDialog;
