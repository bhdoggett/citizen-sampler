"use client";
import type { ConfirmAction } from "../../app/contexts/UIContext";

type ConfirmActionDialogProps = {
  confirmActionRef: React.RefObject<ConfirmAction>;
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  confirmActionRef,
  setShowDialog,
  setHotKeysActive,
}) => {
  if (!confirmActionRef.current) return null;

  return (
    <>
      <h2 className="text-center text-lg font-bold mb-3">
        {confirmActionRef.current.message}
      </h2>
      <button
        type="button"
        onClick={() => {
          if (!confirmActionRef.current) return;
          confirmActionRef.current.action();
          setShowDialog(null);
          setHotKeysActive(true);
        }}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        {confirmActionRef.current.buttonText}
      </button>
    </>
  );
};

export default ConfirmActionDialog;
