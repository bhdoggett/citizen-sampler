import type { PropsWithChildren } from "react";
import { EngineProvider } from "src/lib/engine/react";
import { createEngineView } from "src/lib/engine/view";
import type {
  Engine,
  EngineCommand,
  EngineEvent,
  HostContext,
} from "src/lib/engine/protocol";

// Test helper: an EngineProvider whose view has already received a host
// context. Overrides replace parts of the fake engine.
export function hostWrapper(host: HostContext, overrides: Partial<Engine> = {}) {
  const sent: EngineCommand[] = [];
  const engine: Engine = {
    send: (command) => sent.push(command),
    subscribe: () => () => {},
    start: () => Promise.resolve(),
    renderStem: () => Promise.resolve(null),
    saveMidi: () => Promise.resolve(),
    dispose: () => {},
    ...overrides,
  };
  const view = createEngineView((listener) => {
    const event: EngineEvent = { type: "hostContext", ...host };
    listener(event);
    return () => {};
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <EngineProvider engine={engine} view={view}>
      {children}
    </EngineProvider>
  );
  return { sent, wrapper };
}

export const WEB_HOST: HostContext = {
  isPlugin: false,
  layout: "kit",
  tempo: null,
  hostPlaying: false,
};
