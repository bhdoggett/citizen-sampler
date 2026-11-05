import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DesktopDownload, { RELEASES_URL } from "./DesktopDownload";

describe("DesktopDownload", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("links the website to the GitHub releases page", () => {
    render(<DesktopDownload />);
    const link = screen.getByRole("link", { name: /desktop/i });
    expect(link.getAttribute("href")).toBe(RELEASES_URL);
    expect(RELEASES_URL).toBe(
      "https://github.com/bhdoggett/citizen-sampler/releases/latest",
    );
  });

  it("renders nothing in the desktop app's build", () => {
    vi.stubEnv("NEXT_PUBLIC_DESKTOP_APP", "1");
    const { container } = render(<DesktopDownload />);
    expect(container.innerHTML).toBe("");
  });
});
