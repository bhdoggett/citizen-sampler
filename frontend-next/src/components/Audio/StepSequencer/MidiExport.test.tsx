import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import MidiExport from "./MidiExport";
import { hostWrapper, WEB_HOST } from "../hostTestUtil";
import { SongStoreProvider } from "src/lib/song/react";
import { createSongStore, type Samples } from "src/lib/song/store";
import { defaultLoopSettings, defaultSampleSettings } from "src/lib/audio/defaults";
import type { Engine, EngineEvent, HostContext } from "src/lib/engine/protocol";
import type { SampleEventFE, SampleTypeFE } from "src/types/audioTypesFE";

// jsdom has no PointerEvent, so fireEvent would drop clientX/clientY
if (typeof window.PointerEvent === "undefined") {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  window.PointerEvent = PointerEvent as typeof window.PointerEvent;
}

const audio = { songTitle: "My Song", currentLoop: "A" };
vi.mock("src/app/contexts/AudioContext", () => ({
  useAudioContext: () => audio,
}));

const PLUGIN_KIT: HostContext = {
  isPlugin: true,
  layout: "kit",
  tempo: 100,
  hostPlaying: false,
};

function pad(id: string, events: SampleEventFE[]): SampleTypeFE {
  return {
    id,
    title: id,
    type: "loc",
    collectionName: "test",
    url: `${id}.mp3`,
    events: { A: events, B: [], C: [], D: [] },
    settings: defaultSampleSettings(),
  };
}

const hit = (note = "C4"): SampleEventFE => ({
  startTime: 0,
  duration: 0.25,
  note,
  velocity: 1,
});

function setup(
  samples: Samples,
  host: HostContext = WEB_HOST,
  overrides: Partial<Engine> = {},
  events: EngineEvent[] = [],
) {
  const saveMidi = vi.fn<Engine["saveMidi"]>(() => Promise.resolve());
  const { wrapper: EngineWrapper } = hostWrapper(host, { saveMidi, ...overrides }, events);
  const store = createSongStore({ samples, loops: defaultLoopSettings() });
  const wrapper = ({ children }: PropsWithChildren) => (
    <SongStoreProvider store={store}>
      <EngineWrapper>{children}</EngineWrapper>
    </SongStoreProvider>
  );
  return { saveMidi, wrapper };
}

function contains(bytes: Uint8Array, want: number[]): boolean {
  return Array.from(bytes).some((_, i) => want.every((b, j) => bytes[i + j] === b));
}

function containsTempo(bytes: Uint8Array, bpm: number): boolean {
  const micros = Math.round(60_000_000 / bpm);
  const want = [0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff];
  return Array.from(bytes).some((_, i) => want.every((b, j) => bytes[i + j] === b));
}

describe("MidiExport", () => {
  afterEach(() => {
    cleanup();
    audio.songTitle = "My Song";
  });

  it("saves the kit loop under the song title and loop name", () => {
    const { saveMidi, wrapper } = setup({ "pad-1": pad("pad-1", [hit()]) });
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    expect(saveMidi).toHaveBeenCalledTimes(1);
    const [fileName, bytes] = saveMidi.mock.calls[0];
    expect(fileName).toBe("My Song-loop-A.mid");
    expect(bytes.length).toBeGreaterThan(0);
    // Web uses the loop's own tempo
    expect(containsTempo(bytes, 120)).toBe(true);
  });

  it("names a single pad's export after the pad", () => {
    const { saveMidi, wrapper } = setup({ "pad-3": pad("pad-3", [hit()]) });
    render(<MidiExport unit={{ kind: "pad", padId: "pad-3" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    expect(saveMidi.mock.calls[0][0]).toBe("My Song-loop-A-pad-3.mid");
  });

  it("falls back to citizen-sampler when the song has no title", () => {
    audio.songTitle = "";
    const { saveMidi, wrapper } = setup({ "pad-1": pad("pad-1", [hit()]) });
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    expect(saveMidi.mock.calls[0][0]).toBe("citizen-sampler-loop-A.mid");
  });

  it("uses the host tempo in the plugin", () => {
    const { saveMidi, wrapper } = setup({ "pad-1": pad("pad-1", [hit()]) }, PLUGIN_KIT);
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    expect(containsTempo(saveMidi.mock.calls[0][1], 100)).toBe(true);
  });

  it("disables Export on an empty loop", () => {
    const { saveMidi, wrapper } = setup({ "pad-1": pad("pad-1", []) });
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    const button = screen.getByRole("button", { name: "Export MIDI" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(saveMidi).not.toHaveBeenCalled();
  });

  it("has no drag handle when the engine cannot drag", () => {
    const { wrapper } = setup({ "pad-1": pad("pad-1", [hit()]) });
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    expect(screen.queryByLabelText("Drag MIDI")).toBeNull();
  });

  it("starts a drag when the handle is pressed and moved, not on a bare click", () => {
    const dragMidi = vi.fn<NonNullable<Engine["dragMidi"]>>();
    const { wrapper } = setup({ "pad-1": pad("pad-1", [hit()]) }, PLUGIN_KIT, { dragMidi });
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    const handle = screen.getByLabelText("Drag MIDI");

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 0 });
    fireEvent.click(handle);
    expect(dragMidi).not.toHaveBeenCalled();

    // A jitter under the threshold is still a click
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { clientX: 1, clientY: 1 });
    expect(dragMidi).not.toHaveBeenCalled();
    fireEvent.pointerMove(handle, { clientX: 10, clientY: 0 });
    fireEvent.pointerMove(handle, { clientX: 20, clientY: 0 });
    expect(dragMidi).toHaveBeenCalledTimes(1);
    const [fileName, bytes] = dragMidi.mock.calls[0];
    expect(fileName).toBe("My Song-loop-A.mid");
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("disables a pad's Export when only other pads have hits", () => {
    const { wrapper } = setup({ "pad-1": pad("pad-1", [hit()]), "pad-2": pad("pad-2", []) });
    render(<MidiExport unit={{ kind: "pad", padId: "pad-2" }} />, { wrapper });
    const button = screen.getByRole("button", { name: "Export MIDI" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("gives a hit with no length the rest of the pad's sample", () => {
    const untimed = { ...hit(), duration: null };
    const { saveMidi, wrapper } = setup({ "pad-1": pad("pad-1", [untimed]) }, WEB_HOST, {}, [
      { type: "padLoaded", padId: "pad-1", duration: 0.5 },
    ]);
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    // 0.5 s at 120 bpm is 192 ticks (VLQ 0x81 0x40), then a note-off on channel 1
    expect(contains(saveMidi.mock.calls[0][1], [0x81, 0x40, 0x80])).toBe(true);
  });

  it("notes the dropped pitch for a pitched pattern in the plugin's kit layout", () => {
    const { wrapper } = setup({ "pad-1": pad("pad-1", [hit("D4")]) }, PLUGIN_KIT);
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    expect(
      screen.getByText("Pitch dropped: kit layout plays each pad at its own pitch."),
    ).toBeTruthy();
  });

  it("keeps the pitch on the web", () => {
    const { wrapper } = setup({ "pad-1": pad("pad-1", [hit("D4")]) });
    render(<MidiExport unit={{ kind: "kit" }} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Export MIDI" }));
    expect(screen.queryByText(/Pitch dropped/)).toBeNull();
  });
});
