import React, { useRef, useState, useEffect } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import DrumPad from "./DrumPad";

const DrumMachine = () => {
  const { samplersRef } = useAudioContext();
  // Combine all pad IDs into one array
  const allPadIds = Array.from({ length: 16 }, (_, i) => `pad-${i + 1}`);
  // Ref for imperative handles
  const drumPadsHandlersRef = useRef<
    Record<
      string,
      { handlePress: () => void; handleRelease: () => void } | null
    >
  >({});
  const drumPadsButtonRef = useRef<Record<string, HTMLButtonElement | null>>(
    {}
  );
  const [activePad, setActivePad] = useState<string | null>(null);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetEl) return;
      const padId = Object.entries(drumPadsButtonRef.current).find(([, el]) =>
        el?.contains(targetEl)
      )?.[0];
      if (padId && padId !== activePad) {
        if (activePad && drumPadsHandlersRef.current[activePad]) {
          drumPadsHandlersRef.current[activePad].handleRelease();
        }
        drumPadsHandlersRef.current[padId]?.handlePress();
        setActivePad(padId);
      }
      if (!padId && activePad) {
        drumPadsHandlersRef.current[activePad]?.handleRelease();
        setActivePad(null);
      }
    };
    const handleTouchEnd = () => {
      if (activePad && drumPadsHandlersRef.current[activePad]) {
        drumPadsHandlersRef.current[activePad].handleRelease();
        setActivePad(null);
      }
    };
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activePad]);

  return (
    <div className="flex flex-col text-center w-1/2 mt-1">
      <h3 className="bg-slate-800 w-full border-2 border-slate-800 text-white font-bold">
        Sample Pads
      </h3>
      <div className="grid grid-cols-4 gap-0 mt-1 touch-none select-none">
        {allPadIds.map((id) => {
          const samplerObj = samplersRef.current[id];
          return (
            <DrumPad
              key={id}
              id={id}
              sampler={samplerObj?.sampler ?? null}
              ref={(el) => {
                drumPadsHandlersRef.current[id] = el as {
                  handlePress: () => void;
                  handleRelease: () => void;
                } | null;
              }}
              buttonRef={(el) => {
                drumPadsButtonRef.current[id] = el;
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DrumMachine;
