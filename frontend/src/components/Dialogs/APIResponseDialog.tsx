"use client";
import { useEffect } from "react";
import { useUIContext } from "src/app/contexts/UIContext";

const APIResponseDialog: React.FC = () => {
  const { apiResponseMessageRef } = useUIContext();

  useEffect(() => {
    console.log(apiResponseMessageRef.current);
  }, []);

  return (
    <div className="mr-3">
      <h2 className="text-center text-lg font-bold">
        {apiResponseMessageRef.current}
      </h2>
    </div>
  );
};

export default APIResponseDialog;
