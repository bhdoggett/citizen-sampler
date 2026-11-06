import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEffectiveLoopSettings } from "./react";
import { hostWrapper, WEB_HOST } from "src/components/Audio/hostTestUtil";
import type { HostContext } from "./protocol";
import type { LoopSettingsFE } from "src/types/audioTypesFE";

const loop: LoopSettingsFE = { bpm: 120, swing: 0, beats: 4, bars: 2, isInitialized: true };

const plugin = (tempo: number | null): HostContext => ({
  isPlugin: true,
  layout: "kit",
  tempo,
  hostPlaying: false,
});

describe("useEffectiveLoopSettings", () => {
  it("uses the host tempo in the plugin and leaves the stored loop alone", () => {
    const { wrapper } = hostWrapper(plugin(90));
    const { result } = renderHook(() => useEffectiveLoopSettings(loop), { wrapper });
    expect(result.current).toEqual({ ...loop, bpm: 90 });
    expect(loop.bpm).toBe(120);
  });

  it("keeps the stored bpm on the web", () => {
    const { wrapper } = hostWrapper({ ...WEB_HOST, tempo: 90 });
    const { result } = renderHook(() => useEffectiveLoopSettings(loop), { wrapper });
    expect(result.current).toBe(loop);
  });

  it("keeps the stored bpm while the host reports no tempo", () => {
    const { wrapper } = hostWrapper(plugin(null));
    const { result } = renderHook(() => useEffectiveLoopSettings(loop), { wrapper });
    expect(result.current).toBe(loop);
  });

  it("passes a missing loop through", () => {
    const { wrapper } = hostWrapper(plugin(90));
    const { result } = renderHook(() => useEffectiveLoopSettings(null), { wrapper });
    expect(result.current).toBeNull();
  });

  it("returns the same object while nothing changes", () => {
    const { wrapper } = hostWrapper(plugin(90));
    const { result, rerender } = renderHook(() => useEffectiveLoopSettings(loop), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
