import { describe, expect, it } from "vitest";
import { drumKeys } from "./drumKeys";
import {
  ALL_PAD_IDS,
  KIT_PAD_IDS,
  LOC_PAD_IDS,
  PAD_COUNT,
  padId,
  padNumber,
} from "./padLayout";

describe("pad layout", () => {
  it("converts between pad numbers and ids", () => {
    expect(padId(13)).toBe("pad-13");
    expect(padNumber("pad-13")).toBe(13);
  });

  it("lists all 16 pads in order", () => {
    expect(ALL_PAD_IDS).toHaveLength(16);
    expect(ALL_PAD_IDS[0]).toBe("pad-1");
    expect(ALL_PAD_IDS[15]).toBe("pad-16");
  });

  it("splits the pads into 12 loc pads and 4 kit pads", () => {
    expect(LOC_PAD_IDS).toHaveLength(12);
    expect(KIT_PAD_IDS).toEqual(["pad-13", "pad-14", "pad-15", "pad-16"]);
  });

  it("has one hotkey per pad", () => {
    expect(drumKeys).toHaveLength(PAD_COUNT);
  });
});
