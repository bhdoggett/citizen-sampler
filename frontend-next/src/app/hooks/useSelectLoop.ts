import { useCallback } from "react";
import { useAudioContext } from "../contexts/AudioContext";
import { useUIContext } from "../contexts/UIContext";
import type { LoopName } from "@shared/types/audioTypes";

export function useSelectLoop(): (loop: LoopName) => void {
  const {
    allLoopSettings,
    setAllLoopSettings,
    currentLoop,
    setCurrentLoop,
    loopIsPlaying,
  } = useAudioContext();
  const { setShowDialog, uiWarningMessageRef } = useUIContext();

  return useCallback(
    (loop: LoopName) => {
      if (loopIsPlaying) {
        uiWarningMessageRef.current =
          "Stop playback before selecting a different loop";
        setShowDialog("ui-warning");
        return;
      }

      // Check if this loop needs to be initialized
      const currentLoopSettings = allLoopSettings[loop];
      if (!currentLoopSettings || !currentLoopSettings.isInitialized) {
        // Copy settings from current loop
        const sourceSettings = allLoopSettings[currentLoop as LoopName];
        setAllLoopSettings((prev) => ({
          ...prev,
          [loop]: {
            ...sourceSettings,
            isInitialized: true,
          },
        }));
      }

      setCurrentLoop(loop);
    },
    [
      loopIsPlaying,
      allLoopSettings,
      currentLoop,
      setAllLoopSettings,
      setCurrentLoop,
      setShowDialog,
      uiWarningMessageRef,
    ],
  );
}
