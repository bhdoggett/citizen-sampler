import { beforeEach, describe, expect, it } from "vitest";
import { readJSON, readString, writeJSON, writeString } from "./storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a string", () => {
    writeString("songId", "abc");
    expect(readString("songId")).toBe("abc");
  });

  it("removes the key when given an empty value", () => {
    writeString("songId", "abc");
    writeString("songId", "");
    expect(localStorage.getItem("songId")).toBeNull();
    writeString("songId", "abc");
    writeString("songId", null);
    expect(localStorage.getItem("songId")).toBeNull();
  });

  it("round-trips JSON", () => {
    writeJSON("loops", { a: 1 });
    expect(readJSON("loops")).toEqual({ a: 1 });
  });

  it("returns null for missing or unparsable JSON", () => {
    expect(readJSON("loops")).toBeNull();
    localStorage.setItem("loops", "{bad");
    expect(readJSON("loops")).toBeNull();
  });
});
