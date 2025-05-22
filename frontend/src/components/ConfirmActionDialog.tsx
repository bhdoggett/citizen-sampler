"use client";
import type { ConfirmAction } from "./MainMenu";

type ConfirmActionDialogProps = {
  confirmAction: React.RefObject<ConfirmAction>;
  setShowDialogue: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  confirmAction,
  setShowDialogue,
  setHotKeysActive,
}) => {
  if (!confirmAction.current) return null;

  return (
    <div className="flex flex-col border-2 border-black bg-slate-800 m-3 p-4 shadow-md shadow-slate-800 text-white">
      <h2 className="text-center text-lg font-bold mb-3">
        {confirmAction.current.message}
      </h2>
      <button
        type="button"
        onClick={() => {
          if (!confirmAction.current) return;
          confirmAction.current.action();
          setShowDialogue(null);
          setHotKeysActive(true);
        }}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        {confirmAction.current.buttonText}
      </button>
    </div>
  );
};

export default ConfirmActionDialog;
