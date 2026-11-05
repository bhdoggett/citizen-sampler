import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import StepSequencer from "./StepSequencer";
import { hostWrapper, WEB_HOST } from "../hostTestUtil";
import { SongStoreProvider } from "src/lib/song/react";
import { createSongStore, type Samples } from "src/lib/song/store";
import { defaultLoopSettings, defaultSampleSettings } from "src/lib/audio/defaults";
import type { HostContext } from "src/lib/engine/protocol";
import type { SampleTypeFE } from "src/types/audioTypesFE";

const setAllSampleData = vi.fn();
vi.mock("src/app/contexts/AudioContext", () => ({
  useAudioContext: () => ({
    setAllSampleData,
    currentLoop: "A",
    selectedSampleId: "pad-1",
    setSelectedSampleId: vi.fn(),
    loopIsPlaying: false,
    songTitle: "Song",
  }),
}));
vi.mock("src/app/contexts/UIContext", () => ({
  useUIContext: () => ({ hotKeysActive: false, openDialog: vi.fn() }),
}));

function pad(id: string): SampleTypeFE {
  return {
    id,
    title: id,
    type: "loc",
    collectionName: "test",
    url: `${id}.mp3`,
    events: { A: [], B: [], C: [], D: [] },
    settings: defaultSampleSettings(),
  };
}

// Clicks the first cell of pad 1's row and returns the hit it would add
function clickFirstCell(host: HostContext) {
  const samples: Samples = { "pad-1": pad("pad-1") };
  const store = createSongStore({ samples, loops: defaultLoopSettings() });
  const { wrapper: EngineWrapper } = hostWrapper(host);
  const wrapper = ({ children }: PropsWithChildren) => (
    <SongStoreProvider store={store}>
      <EngineWrapper>{children}</EngineWrapper>
    </SongStoreProvider>
  );
  const { container } = render(<StepSequencer />, { wrapper });
  const cell = container.querySelector('[class*="cellLayer"] > div');
  if (!cell) throw new Error("no grid cell");
  fireEvent.click(cell);
  const update = setAllSampleData.mock.calls[0][0] as (prev: Samples) => Samples;
  return update(samples)["pad-1"].events.A[0];
}

describe("StepSequencer tempo", () => {
  afterEach(() => {
    cleanup();
    setAllSampleData.mockClear();
  });

  it("sizes a new eighth note at the stored bpm on the web", () => {
    // 120 BPM: an eighth note lasts 0.25 s
    expect(clickFirstCell(WEB_HOST).duration).toBeCloseTo(0.25);
  });

  it("sizes a new eighth note at the host tempo in the plugin", () => {
    // 60 BPM: an eighth note lasts 0.5 s
    const host: HostContext = { isPlugin: true, layout: "kit", tempo: 60, hostPlaying: false };
    expect(clickFirstCell(host).duration).toBeCloseTo(0.5);
  });
});
