import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePitchDetector } from "./usePitchDetector";
import { EngineProvider } from "src/lib/engine/react";
import { createEngineView } from "src/lib/engine/view";
import type { Engine, EngineCommand } from "src/lib/engine/protocol";

function setup() {
  const sent: EngineCommand[] = [];
  const engine: Engine = {
    send: (command) => sent.push(command),
    subscribe: () => () => {},
    start: () => Promise.resolve(),
    renderStem: () => Promise.resolve(null),
    dispose: () => {},
  };
  const view = createEngineView(() => () => {});
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <EngineProvider engine={engine} view={view}>
      {children}
    </EngineProvider>
  );
  return { sent, wrapper };
}

describe("usePitchDetector", () => {
  it("has the engine listen to a pad only while the tuner is shown", () => {
    const { sent, wrapper } = setup();
    const { rerender, unmount } = renderHook(({ padId }) => usePitchDetector(padId), {
      wrapper,
      initialProps: { padId: "pad-1" },
    });
    rerender({ padId: "pad-2" });
    unmount();
    expect(sent.filter((c) => c.type === "setTunerPad")).toEqual([
      { type: "setTunerPad", padId: "pad-1" },
      { type: "setTunerPad", padId: null },
      { type: "setTunerPad", padId: "pad-2" },
      { type: "setTunerPad", padId: null },
    ]);
  });
});
