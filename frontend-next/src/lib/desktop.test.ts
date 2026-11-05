import { afterEach, describe, expect, it, vi } from "vitest";
import { isDesktopApp, needsAudioUnlock } from "./desktop";

describe("isDesktopApp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is false on the website", () => {
    expect(isDesktopApp()).toBe(false);
  });

  it("is true in the desktop app's build", () => {
    vi.stubEnv("NEXT_PUBLIC_DESKTOP_APP", "1");
    expect(isDesktopApp()).toBe(true);
  });
});

describe("needsAudioUnlock", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("asks the website for a click before audio starts", () => {
    expect(needsAudioUnlock(false)).toBe(true);
    expect(needsAudioUnlock(true)).toBe(false);
  });

  it("never asks in the desktop app, where the C++ engine plays", () => {
    vi.stubEnv("NEXT_PUBLIC_DESKTOP_APP", "1");
    expect(needsAudioUnlock(false)).toBe(false);
  });
});
