// contexts/UIContext.tsx
"use client";

import { createContext, useCallback, useContext, useState } from "react";

// Every dialog the app can show. Dialogs that show a message carry it with
// them, so opening one is a single call.
export type DialogState =
  | {
      type: "confirm-action";
      message: string;
      buttonText: string;
      onConfirm: () => void;
    }
  | { type: "api-response"; message: string }
  | { type: "ui-warning"; message: string }
  | {
      type:
        | "choose-sample"
        | "load-song"
        | "save-new-song"
        | "collection-menu"
        | "kit-menu"
        | "auth-dialog"
        | "about"
        | "help-shortcuts"
        | "welcome";
    };

type UIContextType = {
  makeBeatsButtonPressed: boolean;
  setMakeBeatsButtonPressed: React.Dispatch<React.SetStateAction<boolean>>;
  dialog: DialogState | null;
  openDialog: (next: DialogState) => void;
  closeDialog: () => void;
  // Pad and transport hotkeys are off while any dialog is open
  hotKeysActive: boolean;
  sequencerVisible: boolean;
  setSequencerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const openDialog = useCallback((next: DialogState) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const hotKeysActive = dialog === null;
  const [makeBeatsButtonPressed, setMakeBeatsButtonPressed] =
    useState<boolean>(false);
  const [sequencerVisible, setSequencerVisible] = useState<boolean>(false);

  return (
    <UIContext.Provider
      value={{
        makeBeatsButtonPressed,
        setMakeBeatsButtonPressed,
        dialog,
        openDialog,
        closeDialog,
        hotKeysActive,
        sequencerVisible,
        setSequencerVisible,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUIContext must be used within a UIProvider");
  }
  return context;
};
