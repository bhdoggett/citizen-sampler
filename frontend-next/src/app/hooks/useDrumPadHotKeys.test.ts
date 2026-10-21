import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import useDrumPadHotKeys from "./useDrumPadHotKeys";

const press = (key: string, init: KeyboardEventInit = {}) =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key, ...init }));
const release = (key: string) =>
  window.dispatchEvent(new KeyboardEvent("keyup", { key }));

const setup = (hotKeysActive = true) => {
  const onPress = vi.fn();
  const onRelease = vi.fn();
  const hook = renderHook(() =>
    useDrumPadHotKeys({ hotKeysActive, padKey: "q", onPress, onRelease })
  );
  return { onPress, onRelease, ...hook };
};

describe("useDrumPadHotKeys", () => {
  afterEach(cleanup);

  it("calls onPress and onRelease for the pad key", () => {
    const { onPress, onRelease } = setup();
    press("q");
    release("q");
    expect(onPress).toHaveBeenCalledOnce();
    expect(onRelease).toHaveBeenCalledOnce();
  });

  it("ignores other keys", () => {
    const { onPress, onRelease } = setup();
    press("w");
    release("w");
    expect(onPress).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });

  it("ignores key repeat and meta-key shortcuts", () => {
    const { onPress } = setup();
    press("q", { repeat: true });
    press("q", { metaKey: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does nothing while hot keys are inactive", () => {
    const { onPress, onRelease } = setup(false);
    press("q");
    release("q");
    expect(onPress).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });

  it("removes listeners on unmount", () => {
    const { onPress, unmount } = setup();
    unmount();
    press("q");
    expect(onPress).not.toHaveBeenCalled();
  });
});
