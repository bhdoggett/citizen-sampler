import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Transport from "./Transport";
import { hostWrapper, WEB_HOST } from "./hostTestUtil";

vi.mock("../../app/contexts/AudioContext", () => ({
  useAudioContext: () => ({ loopIsPlaying: false, isRecording: false }),
}));
vi.mock("src/app/contexts/UIContext", () => ({
  useUIContext: () => ({ hotKeysActive: true }),
}));

const HOST_PLAYING = {
  isPlugin: true,
  layout: "kit" as const,
  tempo: 120,
  hostPlaying: true,
};

describe("Transport", () => {
  afterEach(cleanup);

  it("disables Play and Record while the host plays", () => {
    const { wrapper } = hostWrapper(HOST_PLAYING);
    render(<Transport />, { wrapper });
    expect(screen.getAllByTitle("Stopped while your DAW plays")).toHaveLength(2);
    for (const b of screen.getAllByTitle("Stopped while your DAW plays")) {
      expect((b as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("ignores Space and Ctrl+R while the host plays", () => {
    const { wrapper, sent } = hostWrapper(HOST_PLAYING);
    render(<Transport />, { wrapper });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "r", ctrlKey: true });
    expect(sent.some((c) => c.type === "play" || c.type === "setRecording")).toBe(
      false,
    );
  });

  it("keeps Play and Record enabled on the web", async () => {
    const { wrapper, sent } = hostWrapper(WEB_HOST);
    render(<Transport />, { wrapper });
    expect((screen.getByTitle("Play (Space)") as HTMLButtonElement).disabled).toBe(
      false,
    );
    fireEvent.keyDown(window, { key: " " });
    await waitFor(() => expect(sent.some((c) => c.type === "play")).toBe(true));
  });
});
