import { describe, expect, it, vi } from "vitest";
import { resolvePlayNote } from "./resolvePlayNote";

vi.mock("tone", async () => (await import("src/test/toneMock")).toneMock);

describe("resolvePlayNote", () => {
  it("passes notes through when the base note is C4", () => {
    expect(resolvePlayNote("E4", "C4")).toBe("E4");
  });

  it("maps the base note to C4 so it plays at natural pitch", () => {
    expect(resolvePlayNote("A3", "A3")).toBe("C4");
  });

  it("shifts other notes by the same interval", () => {
    // Base D4 is 2 semitones above C4, so everything moves down 2.
    expect(resolvePlayNote("E4", "D4")).toBe("D4");
    expect(resolvePlayNote("C5", "D4")).toBe("A#4");
  });
});
