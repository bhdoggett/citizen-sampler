import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  isPadPlaying,
  setPadPlaying,
  usePadPlaying,
  useReportPadPlaying,
} from "./usePadPlaying";

describe("usePadPlaying", () => {
  afterEach(() => {
    cleanup();
    setPadPlaying("pad-1", "a", false);
    setPadPlaying("pad-1", "b", false);
  });

  it("updates subscribers when a pad starts and stops", () => {
    const { result } = renderHook(() => usePadPlaying("pad-1"));
    expect(result.current).toBe(false);
    act(() => setPadPlaying("pad-1", "a", true));
    expect(result.current).toBe(true);
    act(() => setPadPlaying("pad-1", "a", false));
    expect(result.current).toBe(false);
  });

  it("stays playing until every source releases", () => {
    setPadPlaying("pad-1", "a", true);
    setPadPlaying("pad-1", "b", true);
    setPadPlaying("pad-1", "a", false);
    expect(isPadPlaying("pad-1")).toBe(true);
    setPadPlaying("pad-1", "b", false);
    expect(isPadPlaying("pad-1")).toBe(false);
  });

  it("returns false when opted out with null", () => {
    setPadPlaying("pad-1", "a", true);
    const { result } = renderHook(() => usePadPlaying(null));
    expect(result.current).toBe(false);
  });

  it("clears a reported state on unmount", () => {
    const { unmount } = renderHook(() =>
      useReportPadPlaying("pad-1", "a", true),
    );
    expect(isPadPlaying("pad-1")).toBe(true);
    unmount();
    expect(isPadPlaying("pad-1")).toBe(false);
  });
});
