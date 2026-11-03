import { describe, expect, it } from "vitest";
import { LOOP_NAMES, emptyLoopEvents, isLoopName } from "./loops";

describe("LOOP_NAMES", () => {
  it("lists the four loops in order", () => {
    expect(LOOP_NAMES).toEqual(["A", "B", "C", "D"]);
  });
});

describe("isLoopName", () => {
  it("accepts a loop name", () => {
    expect(isLoopName("C")).toBe(true);
  });

  it("rejects other strings, including lowercase names", () => {
    expect(isLoopName("E")).toBe(false);
    expect(isLoopName("a")).toBe(false);
  });
});

describe("emptyLoopEvents", () => {
  it("has an empty list for every loop", () => {
    expect(emptyLoopEvents()).toEqual({ A: [], B: [], C: [], D: [] });
  });

  it("returns a fresh object each call", () => {
    const first = emptyLoopEvents();
    const second = emptyLoopEvents();
    expect(first).not.toBe(second);
    expect(first.A).not.toBe(second.A);
  });
});
