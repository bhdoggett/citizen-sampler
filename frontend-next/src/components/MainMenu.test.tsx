import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Menu from "./MainMenu";
import { hostWrapper, WEB_HOST } from "./Audio/hostTestUtil";

const checkLogin = vi.fn(async () => ({ loggedIn: true }));
vi.mock("src/lib/api/client", () => ({
  GENERIC_ERROR_MESSAGE: "",
  apiErrorMessage: () => "",
  checkLogin: (...args: unknown[]) => checkLogin(...(args as [])),
  deleteSong: vi.fn(),
  isAuthRejection: () => false,
  updateSong: vi.fn(),
}));
vi.mock("src/lib/song/react", () => ({
  useSongStore: () => ({ getState: () => ({}) }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../app/contexts/AuthContext", () => ({
  useAuthContext: () => ({
    isAuthenticated: false,
    token: "tok",
    userId: "u",
    displayName: "",
    logout: vi.fn(),
    setError: vi.fn(),
  }),
}));
vi.mock("../app/contexts/AudioContext", () => ({
  useAudioContext: () => ({ songTitle: "", songId: "" }),
}));
vi.mock("../app/contexts/UIContext", () => ({
  useUIContext: () => ({ openDialog: vi.fn() }),
}));
vi.mock("../app/hooks/useDownloadWavStems", () => ({ default: () => vi.fn() }));

const PLUGIN = {
  isPlugin: true,
  layout: "kit" as const,
  tempo: null,
  hostPlaying: false,
};

describe("MainMenu", () => {
  afterEach(() => {
    cleanup();
    checkLogin.mockClear();
  });

  it("hides account items in the plugin but keeps collection and stems", () => {
    const { wrapper } = hostWrapper(PLUGIN);
    render(<Menu />, { wrapper });
    fireEvent.click(screen.getByLabelText("Menu"));
    for (const name of ["Login", "Save Song", "Save As", "Load Song"]) {
      expect(screen.queryByText(name)).toBeNull();
    }
    expect(screen.getByText("Load Collection")).toBeTruthy();
    expect(screen.getByText("Download Stems")).toBeTruthy();
  });

  it("skips the login check in the plugin", () => {
    const { wrapper } = hostWrapper(PLUGIN);
    render(<Menu />, { wrapper });
    expect(checkLogin).not.toHaveBeenCalled();
  });

  it("shows Login and checks the token on the web", () => {
    const { wrapper } = hostWrapper(WEB_HOST);
    render(<Menu />, { wrapper });
    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByText("Login")).toBeTruthy();
    expect(checkLogin).toHaveBeenCalled();
  });

  it("hides the 16 outputs toggle on the web", () => {
    const { wrapper } = hostWrapper(WEB_HOST);
    render(<Menu />, { wrapper });
    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.queryByText("16 outputs (one per pad)")).toBeNull();
  });

  it("shows the 16 outputs toggle in the plugin, checked in multi-out", () => {
    const { wrapper } = hostWrapper({ ...PLUGIN, layout: "multiOut" });
    render(<Menu />, { wrapper });
    fireEvent.click(screen.getByLabelText("Menu"));
    const toggle = screen.getByRole("menuitemcheckbox", { name: "16 outputs (one per pad)" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    const hint = screen.getByText(
      "Also pick Multi-Output (16xStereo) when you add Citizen Sampler in your DAW.",
    );
    expect(hint.getAttribute("role")).toBe("none");
    expect(toggle.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("switches the plugin to the other pad layout", () => {
    const kit = hostWrapper(PLUGIN);
    render(<Menu />, { wrapper: kit.wrapper });
    fireEvent.click(screen.getByLabelText("Menu"));
    const toggle = screen.getByRole("menuitemcheckbox", { name: "16 outputs (one per pad)" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(kit.sent).toContainEqual({ type: "setPadLayout", layout: "multiOut" });
    cleanup();

    const multi = hostWrapper({ ...PLUGIN, layout: "multiOut" });
    render(<Menu />, { wrapper: multi.wrapper });
    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "16 outputs (one per pad)" }));
    expect(multi.sent).toContainEqual({ type: "setPadLayout", layout: "kit" });
  });
});
