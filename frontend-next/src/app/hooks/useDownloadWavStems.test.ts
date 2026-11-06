import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Engine, StemAudio } from "src/lib/engine/protocol";
import useDownloadWavStems from "./useDownloadWavStems";

const openDialog = vi.fn();
let engine: Partial<Engine>;

vi.mock("src/lib/song/react", () => ({
  useSongStore: () => ({
    getState: () => ({ samples: { "pad-1": {}, "pad-2": {} } }),
  }),
}));
vi.mock("../contexts/AudioContext", () => ({
  useAudioContext: () => ({ songTitle: "My Song" }),
}));
vi.mock("../contexts/UIContext", () => ({
  useUIContext: () => ({ openDialog }),
}));
vi.mock("src/lib/engine/react", () => ({ useEngine: () => engine }));
vi.mock("audiobuffer-to-wav", () => ({ default: () => new ArrayBuffer(8) }));

const stem: StemAudio = { sampleRate: 48000, channels: [Float32Array.from([0, 0.5])] };

const run = async () => {
  const { result } = renderHook(() => useDownloadWavStems());
  await result.current();
};

describe("useDownloadWavStems", () => {
  let clicked: string[];

  beforeEach(() => {
    openDialog.mockReset();
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push(this.download);
    });
    URL.createObjectURL = vi.fn(() => "blob:stem");
    URL.revokeObjectURL = vi.fn();
  });

  it("downloads one WAV per rendered pad and loop on the web", async () => {
    engine = {
      start: vi.fn(() => Promise.resolve()),
      renderStem: vi.fn((padId: string, loop: string) =>
        Promise.resolve(padId === "pad-1" && loop === "A" ? stem : null)
      ),
    };
    await run();
    expect(engine.renderStem).toHaveBeenCalledTimes(8);
    expect(clicked).toEqual(["My Song-1-A.wav"]);
    expect(engine.start).toHaveBeenCalled();
    expect(openDialog).not.toHaveBeenCalled();
  });

  it("saves stems natively in the desktop app without browser downloads", async () => {
    engine = {
      start: vi.fn(() => Promise.resolve()),
      renderStem: vi.fn(() => Promise.resolve(stem)),
      saveStems: vi.fn(() =>
        Promise.resolve({ saved: 3, folder: "/Users/me/Music/Citizen Sampler/Stems/My Song" })
      ),
    };
    await run();
    expect(engine.saveStems).toHaveBeenCalledTimes(1);
    expect(engine.saveStems).toHaveBeenCalledWith("My Song");
    expect(engine.renderStem).not.toHaveBeenCalled();
    expect(clicked).toEqual([]);
    expect(openDialog).toHaveBeenCalledWith({
      type: "api-response",
      message: "Saved 3 stems to /Users/me/Music/Citizen Sampler/Stems/My Song.",
    });
  });

  it("says so when there are no stems to save", async () => {
    engine = {
      start: vi.fn(() => Promise.resolve()),
      renderStem: vi.fn(() => Promise.resolve(null)),
      saveStems: vi.fn(() => Promise.resolve({ saved: 0 })),
    };
    await run();
    expect(clicked).toEqual([]);
    expect(openDialog).toHaveBeenCalledWith({
      type: "api-response",
      message: "No stems to export: add hits to a loop first.",
    });
  });

  it("reports stems that could not be written", async () => {
    engine = {
      start: vi.fn(() => Promise.resolve()),
      renderStem: vi.fn(() => Promise.resolve(null)),
      saveStems: vi.fn(() => Promise.resolve({ saved: 0, failed: 2, folder: "/Stems/My Song" })),
    };
    await run();
    expect(openDialog).toHaveBeenCalledWith({
      type: "api-response",
      message: "Could not save stems to /Stems/My Song.",
    });
  });

  it("counts failures alongside saved stems", async () => {
    engine = {
      start: vi.fn(() => Promise.resolve()),
      renderStem: vi.fn(() => Promise.resolve(null)),
      saveStems: vi.fn(() => Promise.resolve({ saved: 3, failed: 1, folder: "/Stems/My Song" })),
    };
    await run();
    expect(openDialog).toHaveBeenCalledWith({
      type: "api-response",
      message: "Saved 3 stems to /Stems/My Song (1 failed).",
    });
  });

  it("shows an error when the native export fails", async () => {
    engine = {
      start: vi.fn(() => Promise.resolve()),
      renderStem: vi.fn(() => Promise.resolve(null)),
      saveStems: vi.fn(() => Promise.reject(new Error("boom"))),
    };
    await run();
    expect(clicked).toEqual([]);
    expect(openDialog).toHaveBeenCalledWith({
      type: "api-response",
      message: "Could not export stems.",
    });
  });
});
