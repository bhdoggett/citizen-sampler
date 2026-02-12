// contexts/UIContext.tsx
"use client";

import { createContext, useContext, useRef, useState } from "react";

export type ConfirmAction = {
  message: string;
  buttonText: string;
  action: () => void;
} | null;

type UIContextType = {
  makeBeatsButtonPressed: boolean;
  setMakeBeatsButtonPressed: React.Dispatch<React.SetStateAction<boolean>>;
  confirmActionRef: React.RefObject<ConfirmAction>;
  apiResponseMessageRef: React.RefObject<string | null>;
  uiWarningMessageRef: React.RefObject<string | null>;
  showDialog: string | null;
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  hotKeysActive: boolean;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
  sequencerVisible: boolean;
  setSequencerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const confirmActionRef = useRef<ConfirmAction>(null);
  const apiResponseMessageRef = useRef<string | null>(null);
  const uiWarningMessageRef = useRef<string | null>(null);
  const [showDialog, setShowDialog] = useState<string | null>(null);
  const [hotKeysActive, setHotKeysActive] = useState<boolean>(true);
  const [makeBeatsButtonPressed, setMakeBeatsButtonPressed] =
    useState<boolean>(false);
  const [sequencerVisible, setSequencerVisible] = useState<boolean>(false);

  return (
    <UIContext.Provider
      value={{
        makeBeatsButtonPressed,
        setMakeBeatsButtonPressed,
        confirmActionRef,
        apiResponseMessageRef,
        uiWarningMessageRef,
        showDialog,
        setShowDialog,
        hotKeysActive,
        setHotKeysActive,
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
