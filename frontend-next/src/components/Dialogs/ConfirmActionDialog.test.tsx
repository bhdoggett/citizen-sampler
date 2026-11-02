import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { UIProvider, useUIContext } from "src/app/contexts/UIContext";
import ConfirmActionDialog from "./ConfirmActionDialog";

// Opens a confirm on mount and renders it the way page.tsx does
const Harness = ({ onConfirm }: { onConfirm: () => void }) => {
  const { dialog, openDialog } = useUIContext();
  useEffect(() => {
    openDialog({
      type: "confirm-action",
      message: "Clear the loop?",
      buttonText: "Clear",
      onConfirm,
    });
  }, [openDialog, onConfirm]);
  if (dialog?.type !== "confirm-action") return <p>closed</p>;
  return <ConfirmActionDialog {...dialog} />;
};

describe("ConfirmActionDialog", () => {
  afterEach(cleanup);

  it("runs the action and closes when confirmed", () => {
    const onConfirm = vi.fn();
    render(
      <UIProvider>
        <Harness onConfirm={onConfirm} />
      </UIProvider>
    );

    expect(screen.getByText("Clear the loop?")).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByText("Clear"));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText("closed")).toBeTruthy();
  });
});
