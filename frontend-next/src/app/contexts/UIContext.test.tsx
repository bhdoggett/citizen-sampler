import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { UIProvider, useUIContext } from "./UIContext";

const renderUI = () => renderHook(() => useUIContext(), { wrapper: UIProvider });

describe("UIContext dialogs", () => {
  afterEach(cleanup);

  it("starts with no dialog open", () => {
    const { result } = renderUI();
    expect(result.current.dialog).toBeNull();
  });

  it("opens and closes a dialog with its message", () => {
    const { result } = renderUI();
    act(() => result.current.openDialog({ type: "api-response", message: "Saved" }));
    expect(result.current.dialog).toEqual({ type: "api-response", message: "Saved" });
    act(() => result.current.closeDialog());
    expect(result.current.dialog).toBeNull();
  });

  it("carries each confirm's own action, never an earlier one", () => {
    const { result } = renderUI();
    const first = vi.fn();
    const second = vi.fn();
    act(() =>
      result.current.openDialog({
        type: "confirm-action",
        message: "First?",
        buttonText: "Yes",
        onConfirm: first,
      })
    );
    act(() =>
      result.current.openDialog({
        type: "confirm-action",
        message: "Second?",
        buttonText: "Yes",
        onConfirm: second,
      })
    );
    const dialog = result.current.dialog;
    expect(dialog?.type === "confirm-action" && dialog.onConfirm).toBe(second);
  });
});
