import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Loop from "./Loop";
import { hostWrapper, WEB_HOST } from "./hostTestUtil";

const setAllLoopSettings = vi.fn();
vi.mock("../../app/contexts/AudioContext", () => ({
  useAudioContext: () => ({
    setAllLoopSettings,
    currentLoop: "A",
    loopIsPlaying: false,
  }),
}));
vi.mock("src/app/contexts/UIContext", () => ({
  useUIContext: () => ({ openDialog: vi.fn() }),
}));
vi.mock("src/lib/song/react", () => ({
  useLoops: () => ({ A: { bpm: 90, swing: 0, beats: 4, bars: 1 } }),
}));
vi.mock("./LoopProgress", () => ({ default: () => null }));
vi.mock("src/app/hooks/useSelectLoop", () => ({ useSelectLoop: () => vi.fn() }));

describe("Loop BPM", () => {
  afterEach(() => {
    cleanup();
    setAllLoopSettings.mockClear();
  });

  it("follows the host tempo, read-only, in the plugin", () => {
    const { wrapper } = hostWrapper({
      isPlugin: true,
      layout: "kit",
      tempo: 97.5,
      hostPlaying: false,
    });
    render(<Loop />, { wrapper });
    const bpm = screen.getByLabelText("BPM") as HTMLInputElement;
    expect(bpm.value).toBe("97.5");
    expect(bpm.readOnly).toBe(true);
    expect(bpm.title).toBe("Follows your DAW's tempo");
    fireEvent.change(bpm, { target: { value: "100" } });
    expect(setAllLoopSettings).not.toHaveBeenCalled();
  });

  it("rounds the host tempo to 2 decimals", () => {
    const { wrapper } = hostWrapper({
      isPlugin: true,
      layout: "kit",
      tempo: 97.456,
      hostPlaying: false,
    });
    render(<Loop />, { wrapper });
    expect((screen.getByLabelText("BPM") as HTMLInputElement).value).toBe("97.46");
  });

  it("stays editable on the web", () => {
    const { wrapper } = hostWrapper(WEB_HOST);
    render(<Loop />, { wrapper });
    const bpm = screen.getByLabelText("BPM") as HTMLInputElement;
    expect(bpm.value).toBe("90");
    expect(bpm.readOnly).toBe(false);
    fireEvent.change(bpm, { target: { value: "100" } });
    expect(setAllLoopSettings).toHaveBeenCalled();
  });
});
