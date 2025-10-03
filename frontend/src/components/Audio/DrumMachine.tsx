import { useRef, useState, useEffect } from "react";
import { useAudioContext } from "../../contexts/AudioContext";
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
  const [activePads, setActivePads] = useState<Set<string>>(new Set());

  useEffect(() => {
    const getPadIdFromTouch = (touch: Touch) => {
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetEl) return null;
      return (
        Object.entries(drumPadsButtonRef.current).find(([, el]) =>
          el?.contains(targetEl)
        )?.[0] || null
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touches = Array.from(e.touches);
      const newActivePads = new Set<string>();

      // Process all touches
      touches.forEach((touch) => {
        const padId = getPadIdFromTouch(touch);
        if (padId) {
          newActivePads.add(padId);
          if (!activePads.has(padId)) {
            drumPadsHandlersRef.current[padId]?.handlePress();
          }
        }
      });

      // Release pads that are no longer active
      activePads.forEach((padId) => {
        if (!newActivePads.has(padId)) {
          drumPadsHandlersRef.current[padId]?.handleRelease();
        }
      });

      setActivePads(newActivePads);
    };

    const handleTouchMove = (e: TouchEvent) => {
      // If multiple touches, disable touchmove tracking
      if (e.touches.length > 1) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;
      const padId = getPadIdFromTouch(touch);
      const newActivePads = new Set<string>();

      if (padId) {
        newActivePads.add(padId);
        if (!activePads.has(padId)) {
          drumPadsHandlersRef.current[padId]?.handlePress();
        }
      }

      // Release pads that are no longer active
      activePads.forEach((padId) => {
        if (!newActivePads.has(padId)) {
          drumPadsHandlersRef.current[padId]?.handleRelease();
        }
      });

      setActivePads(newActivePads);
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      // Release all active pads
      activePads.forEach((padId) => {
        drumPadsHandlersRef.current[padId]?.handleRelease();
      });
      setActivePads(new Set());
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activePads]);

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
