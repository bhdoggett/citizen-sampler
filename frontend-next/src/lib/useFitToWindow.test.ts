import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import useFitToWindow, { FIT_MARGIN_PX } from "./useFitToWindow";

// jsdom has no layout, so give the element a fixed natural size
function makeElement(width: number, height: number): HTMLElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "offsetWidth", { get: () => width });
  Object.defineProperty(element, "offsetHeight", { get: () => height });
  document.body.appendChild(element);
  return element;
}

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function fitScaleProperty(): string {
  return document.documentElement.style.getPropertyValue("--fit-scale");
}

const margins = 2 * FIT_MARGIN_PX;

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  document.documentElement.style.removeProperty("--fit-scale");
});

describe("useFitToWindow", () => {
  it("shrinks the element to fit a smaller window, inside the margin", () => {
    setWindowSize(400, 300);
    const ref: RefObject<HTMLElement | null> = { current: makeElement(800, 600) };
    const { result } = renderHook(() => useFitToWindow(ref, true));
    expect(result.current).toBeCloseTo(Math.min((400 - margins) / 800, (300 - margins) / 600));
    expect(result.current).toBeLessThan(0.5);
  });

  it("grows the element to fill a larger window", () => {
    setWindowSize(1600 + margins, 1200 + margins);
    const ref: RefObject<HTMLElement | null> = { current: makeElement(800, 600) };
    const { result } = renderHook(() => useFitToWindow(ref, true));
    expect(result.current).toBeCloseTo(2);
  });

  it("is limited by the tighter of width and height", () => {
    setWindowSize(1600 + margins, 600 + margins);
    const ref: RefObject<HTMLElement | null> = { current: makeElement(800, 600) };
    const { result } = renderHook(() => useFitToWindow(ref, true));
    expect(result.current).toBeCloseTo(1);
  });

  it("sets the scale on the root element as --fit-scale, and clears it on unmount", () => {
    setWindowSize(1600 + margins, 1200 + margins);
    const element = makeElement(800, 600);
    const { unmount } = renderHook(() => useFitToWindow({ current: element }, true));
    expect(Number(fitScaleProperty())).toBeCloseTo(2);
    unmount();
    expect(fitScaleProperty()).toBe("");
  });

  it("returns 1 and leaves the element alone when disabled", () => {
    setWindowSize(400, 300);
    const element = makeElement(800, 600);
    const { result } = renderHook(() => useFitToWindow({ current: element }, false));
    expect(result.current).toBe(1);
    expect(fitScaleProperty()).toBe("");
  });

  it("recomputes when the window resizes", () => {
    setWindowSize(800 + margins, 600 + margins);
    const ref: RefObject<HTMLElement | null> = { current: makeElement(800, 600) };
    const { result } = renderHook(() => useFitToWindow(ref, true));
    expect(result.current).toBeCloseTo(1);

    act(() => {
      setWindowSize(400 + margins, 300 + margins);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBeCloseTo(0.5);
  });

  it("measures at scale 1 so the applied scale does not feed back", () => {
    setWindowSize(1600 + margins, 1200 + margins);
    const element = document.createElement("div");
    // Reports its zoomed size, the way a browser would with zoom applied
    const zoomed = () => Number(fitScaleProperty() || 1);
    Object.defineProperty(element, "offsetWidth", { get: () => 800 * zoomed() });
    Object.defineProperty(element, "offsetHeight", { get: () => 600 * zoomed() });
    document.body.appendChild(element);
    const { result } = renderHook(() => useFitToWindow({ current: element }, true));

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBeCloseTo(2);
  });
});
