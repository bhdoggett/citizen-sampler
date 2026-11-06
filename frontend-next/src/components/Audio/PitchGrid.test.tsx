import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PitchGrid from "./PitchGrid";
import { hostWrapper, WEB_HOST } from "./hostTestUtil";

vi.mock("src/app/contexts/AudioContext", () => ({
  useAudioContext: () => ({ selectedSampleId: "pad-1" }),
}));
vi.mock("src/lib/song/react", () => ({
  usePad: () => ({ settings: { baseNote: "C3" } }),
}));
vi.mock("src/app/hooks/useTouchPads", () => ({ default: () => {} }));
vi.mock("./PitchPad", () => ({
  default: ({ disabled }: { disabled?: boolean }) => <button disabled={disabled}>pad</button>,
}));

const NOTE =
  "Pitched notes need the 16-output layout. In mono or stereo, each MIDI note plays a different pad.";

describe("PitchGrid", () => {
  afterEach(cleanup);

  it("explains itself in the plugin's kit layout, pads disabled", () => {
    const { wrapper } = hostWrapper({
      isPlugin: true,
      layout: "kit",
      tempo: null,
      hostPlaying: false,
    });
    render(<PitchGrid />, { wrapper });
    expect(screen.getByText(NOTE)).toBeTruthy();
    for (const pad of screen.getAllByText("pad")) {
      expect((pad as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("shows no note in the multi-out layout", () => {
    const { wrapper } = hostWrapper({
      isPlugin: true,
      layout: "multiOut",
      tempo: null,
      hostPlaying: false,
    });
    render(<PitchGrid />, { wrapper });
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it("shows no note on the web", () => {
    const { wrapper } = hostWrapper(WEB_HOST);
    render(<PitchGrid />, { wrapper });
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
