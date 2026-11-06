import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PitchGrid from "./PitchGrid";
import { hostWrapper, WEB_HOST } from "./hostTestUtil";
import type { HostContext } from "src/lib/engine/protocol";

vi.mock("src/app/contexts/AudioContext", () => ({
  useAudioContext: () => ({ selectedSampleId: "pad-1" }),
}));
vi.mock("src/app/contexts/MidiContext", () => ({
  useMidiContext: () => ({ activeMidiNotes: new Set<string>() }),
}));
vi.mock("src/lib/song/react", () => ({
  usePad: () => ({ settings: { baseNote: "C3" } }),
}));

const KIT: HostContext = { isPlugin: true, layout: "kit", tempo: null, hostPlaying: false };
const MULTI: HostContext = { ...KIT, layout: "multiOut" };

const padButtons = () =>
  screen.getAllByRole("button").filter((b) => /^[A-G]#?\d$/.test(b.textContent ?? ""));

describe("PitchGrid pads in the plugin kit layout", () => {
  afterEach(cleanup);

  it("disables every pad and sends nothing on pointer down", () => {
    const { sent, wrapper } = hostWrapper(KIT);
    render(<PitchGrid />, { wrapper });
    const pads = padButtons();
    expect(pads.length).toBeGreaterThan(0);
    for (const pad of pads) {
      expect((pad as HTMLButtonElement).disabled).toBe(true);
      fireEvent.mouseDown(pad);
      fireEvent.click(pad);
    }
    expect(sent.filter((c) => c.type === "press")).toEqual([]);
  });

  it("keeps the scale tabs enabled", () => {
    const { wrapper } = hostWrapper(KIT);
    render(<PitchGrid />, { wrapper });
    expect((screen.getByText("Major") as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends nothing on touch", () => {
    const { sent, wrapper } = hostWrapper(KIT);
    render(<PitchGrid />, { wrapper });
    const pad = padButtons()[0];
    document.elementFromPoint = () => pad;
    const touch = { clientX: 1, clientY: 1 } as Touch;
    const event = new Event("touchstart");
    Object.defineProperty(event, "touches", { value: [touch] });
    document.dispatchEvent(event);
    expect(sent.filter((c) => c.type === "press")).toEqual([]);
  });

  it.each([
    ["multiOut", MULTI],
    ["web", WEB_HOST],
  ])("still presses in %s", (_name, host) => {
    const { sent, wrapper } = hostWrapper(host);
    render(<PitchGrid />, { wrapper });
    const pad = padButtons()[0];
    expect((pad as HTMLButtonElement).disabled).toBe(false);
    fireEvent.mouseDown(pad);
    expect(sent.filter((c) => c.type === "press")).toHaveLength(1);
  });
});
