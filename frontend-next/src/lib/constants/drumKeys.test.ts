import { describe, expect, it } from "vitest";
import { getKeySymbol } from "./drumKeys";

describe("getKeySymbol", () => {
  it("shows arrow keys as arrows", () => {
    expect(getKeySymbol("ArrowLeft")).toBe("←");
    expect(getKeySymbol("ArrowUp")).toBe("↑");
    expect(getKeySymbol("ArrowRight")).toBe("→");
    expect(getKeySymbol("ArrowDown")).toBe("↓");
  });

  it("passes other keys through", () => {
    expect(getKeySymbol("q")).toBe("q");
  });
});
