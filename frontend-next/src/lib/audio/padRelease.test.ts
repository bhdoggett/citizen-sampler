import { describe, expect, it } from "vitest";
import { resolveRelease } from "./padRelease";

describe("resolveRelease", () => {
  it("releases the sound and records a normal hit", () => {
    expect(
      resolveRelease({ held: true, oneShot: false, audioReleased: false })
    ).toEqual({ releaseAudio: true, record: true });
  });

  it("still records when the sound already stopped by itself", () => {
    // A short sample ends before the key comes up
    expect(
      resolveRelease({ held: true, oneShot: false, audioReleased: true })
    ).toEqual({ releaseAudio: false, record: true });
  });

  it("records a one-shot pad but lets its sound play out", () => {
    expect(
      resolveRelease({ held: true, oneShot: true, audioReleased: false })
    ).toEqual({ releaseAudio: false, record: true });
  });

  it("ignores a release with no matching press", () => {
    expect(
      resolveRelease({ held: false, oneShot: false, audioReleased: false })
    ).toEqual({ releaseAudio: false, record: false });
  });
});
