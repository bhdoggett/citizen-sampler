import { useEffect, useState, type RefObject } from "react";

// Space kept between the element and each window edge. Matches the
// --space-2 padding page.module.css gives .pageFit.
export const FIT_MARGIN_PX = 8;

// Scales an element to fill the window (desktop app and plugin, where the
// window is the UI). Writes the scale as --fit-scale on the root element, so
// the element and the dialogs (which sit outside it) can apply it with zoom,
// and returns it. Returns 1 when disabled.
export default function useFitToWindow(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const root = document.documentElement;

    const fit = () => {
      // Measure at scale 1 so the current scale does not feed back
      root.style.setProperty("--fit-scale", "1");
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width === 0 || height === 0) return;
      const margins = 2 * FIT_MARGIN_PX;
      const next = Math.min(
        (window.innerWidth - margins) / width,
        (window.innerHeight - margins) / height,
      );
      root.style.setProperty("--fit-scale", String(next));
      setScale(next);
    };

    fit();
    window.addEventListener("resize", fit);
    // Content that loads after mount (the pads) changes the natural size
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(element);
    return () => {
      window.removeEventListener("resize", fit);
      observer?.disconnect();
      root.style.removeProperty("--fit-scale");
    };
  }, [ref, enabled]);

  return enabled ? scale : 1;
}
