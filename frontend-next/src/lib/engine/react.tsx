"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import type { Engine } from "./protocol";
import type { EngineView, EngineViewState } from "./view";

type EngineContextValue = { engine: Engine; view: EngineView };

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({
  engine,
  view,
  children,
}: React.PropsWithChildren<EngineContextValue>) {
  return (
    <EngineContext.Provider value={{ engine, view }}>{children}</EngineContext.Provider>
  );
}

function useEngineContext(): EngineContextValue {
  const value = useContext(EngineContext);
  if (!value) throw new Error("useEngine must be used within an EngineProvider");
  return value;
}

export const useEngine = (): Engine => useEngineContext().engine;

// Re-renders only when the selected value changes identity
export function useEngineView<T>(selector: (state: EngineViewState) => T): T {
  const { view } = useEngineContext();
  return useSyncExternalStore(
    view.subscribe,
    () => selector(view.getState()),
    () => selector(view.getState()),
  );
}

export const useTransportAnchor = () => useEngineView((state) => state.transport);
export const useHostContext = () => useEngineView((state) => state.host);
export const useLoopIsPlaying = () => useEngineView((state) => state.transport.playing);
export const useIsRecording = () => useEngineView((state) => state.transport.recording);
export const useSamplesLoading = () => useEngineView((state) => state.loadingPads > 0);
export const usePreview = () => useEngineView((state) => state.preview);
export const useLastVoice = (padId: string) =>
  useEngineView((state) => state.lastVoice[padId] ?? null);

// Pass null to opt out (always false)
export const usePadPlaying = (padId: string | null) =>
  useEngineView((state) => (padId ? (state.voices[padId]?.length ?? 0) > 0 : false));

export const useNotePlaying = (padId: string, note: string) =>
  useEngineView((state) => state.voices[padId]?.includes(note) ?? false);

// A new object per reading, so a steady pitch still counts as a new frame
export const useEnginePitch = (padId: string) =>
  useEngineView((state) => (state.pitch?.padId === padId ? state.pitch : null));
