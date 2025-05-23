// contexts/UIContext.tsx
"use client";

import { createContext, useContext, useRef, useState } from "react";

export type ConfirmAction = {
  message: string;
  buttonText: string;
  action: () => void;
} | null;

type UIContextType = {
  confirmActionRef: React.RefObject<ConfirmAction>;
  showDialog: string | null;
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const confirmActionRef = useRef<ConfirmAction>(null);
  const [showDialog, setShowDialog] = useState<string | null>(null);

  return (
    <UIContext.Provider value={{ confirmActionRef, showDialog, setShowDialog }}>
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
