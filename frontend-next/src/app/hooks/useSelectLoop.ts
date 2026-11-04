import { useCallback } from "react";
import { useLoops } from "src/lib/song/react";
import { useAudioContext } from "../contexts/AudioContext";
import { useUIContext } from "../contexts/UIContext";
import type { LoopName } from "../../types/audioTypes";

export function useSelectLoop(): (loop: LoopName) => void {
  const allLoopSettings = useLoops();
  const {
    setAllLoopSettings,
    currentLoop,
    setCurrentLoop,
    loopIsPlaying,
  } = useAudioContext();
  const { openDialog } = useUIContext();

  return useCallback(
    (loop: LoopName) => {
      if (loopIsPlaying) {
        openDialog({
          type: "ui-warning",
          message: "Stop playback before selecting a different loop",
        });
        return;
      }

      // Check if this loop needs to be initialized
      const currentLoopSettings = allLoopSettings[loop];
      if (!currentLoopSettings || !currentLoopSettings.isInitialized) {
        // Copy settings from current loop
        const sourceSettings = allLoopSettings[currentLoop];
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
      openDialog,
    ],
  );
}
