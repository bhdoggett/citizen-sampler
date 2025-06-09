"use client";
import { useEffect } from "react";
import { useUIContext } from "../contexts/UIContext";

const useDrumPadHotKeys = ({
  padKey,
  onPress,
  onRelease,
}: {
  padKey: string;
  onPress: () => void;
  onRelease: () => void;
}) => {
  const { hotKeysActive } = useUIContext();

  useEffect(() => {
    if (!hotKeysActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey) return;
      if (e.key === padKey) {
        e.preventDefault();
        onPress();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === padKey) {
        e.preventDefault();
        onRelease();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [padKey, hotKeysActive, onPress, onRelease]);
};

export default useDrumPadHotKeys;
