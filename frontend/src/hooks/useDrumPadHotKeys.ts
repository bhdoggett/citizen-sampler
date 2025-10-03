"use client";
import { useEffect } from "react";

const useDrumPadHotKeys = ({
  hotKeysActive,
  padKey,
  onPress,
  onRelease,
}: {
  hotKeysActive: boolean;
  padKey: string;
  onPress: () => void;
  onRelease: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hotKeysActive || e.metaKey || e.repeat) return;
      if (e.key === padKey) {
        e.preventDefault();
        onPress();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!hotKeysActive) return;
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
