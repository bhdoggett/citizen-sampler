import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import useTouchPads, { diffTouches, findKeyForTarget } from "./useTouchPads";

describe("diffTouches", () => {
  it("presses new keys and releases keys no longer touched", () => {
    expect(diffTouches(new Set(["a", "b"]), ["b", "c"])).toEqual({
      pressed: ["c"],
      released: ["a"],
    });
  });

  it("does nothing with no active keys and no touches", () => {
    expect(diffTouches(new Set(), [])).toEqual({ pressed: [], released: [] });
  });
});

describe("findKeyForTarget", () => {
  it("finds the key whose element contains the target", () => {
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    expect(findKeyForTarget({ x: parent }, child)).toBe("x");
  });

  it("returns null for an element outside every pad", () => {
    const parent = document.createElement("div");
    expect(findKeyForTarget({ x: parent }, document.createElement("p"))).toBeNull();
  });
});

describe("useTouchPads", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const touchEvent = (type: string, touches: { clientX: number; clientY: number }[]) => {
    const event = new Event(type);
    Object.defineProperty(event, "touches", { value: touches });
    return event;
  };

  it("releases a pad when the OS cancels the touch", () => {
    const pad = document.createElement("button");
    document.elementFromPoint = vi.fn(() => pad);
    const handlers = { handlePress: vi.fn(), handleRelease: vi.fn() };

    renderHook(() =>
      useTouchPads({ current: { "pad-1": pad } }, { current: { "pad-1": handlers } })
    );

    document.dispatchEvent(touchEvent("touchstart", [{ clientX: 0, clientY: 0 }]));
    document.dispatchEvent(touchEvent("touchcancel", []));

    expect(handlers.handlePress).toHaveBeenCalledTimes(1);
    expect(handlers.handleRelease).toHaveBeenCalledTimes(1);
  });
});
