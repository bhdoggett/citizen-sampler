import { afterEach, describe, expect, it, vi } from "vitest";
import { isDesktopApp, needsAudioUnlock } from "./desktop";

// Stand-in for the backend object JUCE injects into its WebView
function installJuceBackend() {
  (window as unknown as { __JUCE__?: unknown }).__JUCE__ = {
    backend: {
      addEventListener: () => null,
      removeEventListener: () => {},
      emitEvent: () => {},
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as unknown as { __JUCE__?: unknown }).__JUCE__;
});

describe("isDesktopApp", () => {
  it("is false on the website", () => {
    expect(isDesktopApp()).toBe(false);
  });

  it("is true in the desktop app's build", () => {
    vi.stubEnv("NEXT_PUBLIC_DESKTOP_APP", "1");
    expect(isDesktopApp()).toBe(true);
  });

  it("is true in a JUCE build without the build flag, such as the dev server", () => {
    installJuceBackend();
    expect(isDesktopApp()).toBe(true);
  });
});

describe("needsAudioUnlock", () => {
  it("asks the website for a click before audio starts", () => {
    expect(needsAudioUnlock(false)).toBe(true);
    expect(needsAudioUnlock(true)).toBe(false);
  });

  it("never asks in the desktop app, where the C++ engine plays", () => {
    vi.stubEnv("NEXT_PUBLIC_DESKTOP_APP", "1");
    expect(needsAudioUnlock(false)).toBe(false);
  });

  it("never asks in a JUCE build without the build flag", () => {
    installJuceBackend();
    expect(needsAudioUnlock(false)).toBe(false);
  });
});
