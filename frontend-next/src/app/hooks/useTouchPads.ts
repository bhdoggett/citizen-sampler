"use client";
import { useEffect, useRef } from "react";

export type PadHandlers = { handlePress: () => void; handleRelease: () => void };

// Which keys a new set of touches presses and which it lets go
export function diffTouches(
  active: ReadonlySet<string>,
  touched: readonly string[]
): { pressed: string[]; released: string[] } {
  const touchedSet = new Set(touched);
  return {
    pressed: [...touchedSet].filter((key) => !active.has(key)),
    released: [...active].filter((key) => !touchedSet.has(key)),
  };
}

export function findKeyForTarget(
  elements: Record<string, HTMLElement | null>,
  target: Element | null
): string | null {
  if (!target) return null;
  return (
    Object.entries(elements).find(([, el]) => el?.contains(target))?.[0] ??
    null
  );
}

// Lets a finger slide across pads: each pad under a touch is pressed, and
// released when the touch leaves it. Listens on the document because a
// touch stays bound to the element where it started.
export default function useTouchPads(
  elementsRef: React.RefObject<Record<string, HTMLElement | null>>,
  handlersRef: React.RefObject<Record<string, PadHandlers | null>>
): void {
  const activeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const keyAt = (touch: Touch) =>
      findKeyForTarget(
        elementsRef.current,
        document.elementFromPoint(touch.clientX, touch.clientY)
      );

    const update = (touches: Touch[]) => {
      const touched = touches
        .map(keyAt)
        .filter((key): key is string => key !== null);
      const { pressed, released } = diffTouches(activeRef.current, touched);
      pressed.forEach((key) => handlersRef.current[key]?.handlePress());
      released.forEach((key) => handlersRef.current[key]?.handleRelease());
      activeRef.current = new Set(touched);
    };

    const handleTouchStart = (e: TouchEvent) => update(Array.from(e.touches));

    // Sliding is tracked for a single finger only
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      update([e.touches[0]]);
    };

    const handleTouchEnd = () => {
      activeRef.current.forEach((key) =>
        handlersRef.current[key]?.handleRelease()
      );
      activeRef.current = new Set();
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [elementsRef, handlersRef]);
}
