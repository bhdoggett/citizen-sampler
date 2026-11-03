"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  SampleTypeFE,
  SampleSettingsFE,
  AllLoopSettingsFE,
} from "src/types/audioTypesFE";
import { LoopName } from "../../types/audioTypes";
import { readJSON, readString, writeString } from "src/lib/storage";
import { DEFAULT_SELECTED_PAD } from "src/lib/constants/padLayout";
import { defaultLoopSettings } from "src/lib/audio/defaults";
import { DrumMachineId, migrateDrumUrls } from "../../lib/drumMachines";
import { normalizeAllMuteSolo } from "../../lib/audio/muteSolo";
import {
  initKitSampleData,
  initKitSamples,
  initLocSampleData,
  initLocSamplesFromAllCollections,
  initLocSamplesFromOneCollection,
} from "src/lib/song/initSamples";
import { createSongStore } from "src/lib/song/store";
import { persistSong } from "src/lib/song/persist";
import { SongStoreProvider, useSongStore } from "src/lib/song/react";
import { getEngine, getEngineView } from "src/lib/engine/createEngine";
import { connectStoreToEngine } from "src/lib/engine/sync";
import {
  EngineProvider,
  useEngine,
  useIsRecording,
  useLoopIsPlaying,
  useSamplesLoading,
} from "src/lib/engine/react";

// The song itself lives in the song store and the sound in the engine. This
// context keeps the session around them (title, selection, current loop) and
// offers store writes under their older names. Read song data with the song
// store hooks, so a pad edit only re-renders what shows that pad.
type AudioContextType = {
  songTitle: string;
  setSongTitle: React.Dispatch<React.SetStateAction<string>>;
  songId: string;
  setSongId: React.Dispatch<React.SetStateAction<string>>;
  // True while the engine is still loading any pad's sample
  samplersLoading: boolean;

  initLocSampleData: (
    id: string,
    url: string,
    collection: string
  ) => SampleTypeFE;
  initKitSampleData: (
    id: string,
    url: string,
    title: string,
    collection: string
  ) => SampleTypeFE;
  initKitSamples: (kitId: DrumMachineId) => Record<string, SampleTypeFE>;
  updateSamplerData: (id: string, data: SampleTypeFE) => void;
  currentLoop: LoopName;
  setCurrentLoop: React.Dispatch<React.SetStateAction<LoopName>>;
  loopIsPlaying: boolean;
  isRecording: boolean;

  setAllLoopSettings: React.Dispatch<React.SetStateAction<AllLoopSettingsFE>>;
  setAllSampleData: React.Dispatch<
    React.SetStateAction<Record<string, SampleTypeFE>>
  >;
  updateSamplerStateSettings: (
    id: string,
    settings: Partial<SampleSettingsFE>
  ) => void;
  selectedSampleId: string;
  setSelectedSampleId: React.Dispatch<React.SetStateAction<string>>;
  initLocSamplesFromOneCollection: (
    collection: string
  ) => Record<string, SampleTypeFE>;
  initLocSamplesFromAllCollections: () => Record<string, SampleTypeFE>;
};

const AudioContextContext = createContext<AudioContextType | null>(null);

// Apply a React-style state action to a store value
function resolveAction<T>(action: React.SetStateAction<T>, prev: T): T {
  return typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
}

function loadSavedSong() {
  const savedSamples = readJSON<Record<string, SampleTypeFE>>("samples");
  return {
    samples: savedSamples
      ? normalizeAllMuteSolo(migrateDrumUrls(savedSamples))
      : { ...initLocSamplesFromAllCollections(), ...initKitSamples("mpc") },
    loops: readJSON<AllLoopSettingsFE>("loops") ?? defaultLoopSettings(),
  };
}

export const AudioProvider = ({ children }: React.PropsWithChildren) => {
  const engine = getEngine();
  const view = getEngineView();
  const [store] = useState(() => createSongStore(loadSavedSong()));

  // The engine follows the song, and the song is saved as it changes
  useEffect(() => connectStoreToEngine(store, engine), [store, engine]);
  useEffect(() => persistSong(store), [store]);

  return (
    <SongStoreProvider store={store}>
      <EngineProvider engine={engine} view={view}>
        <AudioSession>{children}</AudioSession>
      </EngineProvider>
    </SongStoreProvider>
  );
};

const AudioSession = ({ children }: React.PropsWithChildren) => {
  const store = useSongStore();
  const engine = useEngine();
  const loopIsPlaying = useLoopIsPlaying();
  const isRecording = useIsRecording();
  const samplersLoading = useSamplesLoading();

  const [songTitle, setSongTitle] = useState<string>(() => {
    return readString("songTitle") ?? "Song001";
  });
  const [songId, setSongId] = useState<string>(() => {
    return readString("songId") ?? "";
  });
  const [currentLoop, setCurrentLoop] = useState<LoopName>("A");
  const [selectedSampleId, setSelectedSampleId] = useState<string>(DEFAULT_SELECTED_PAD);

  useEffect(() => {
    writeString("songTitle", songTitle);
  }, [songTitle]);

  // An empty songId means the song is not saved yet, and clears the key
  useEffect(() => {
    writeString("songId", songId);
  }, [songId]);

  useEffect(() => {
    engine.send({ type: "setCurrentLoop", loop: currentLoop });
  }, [engine, currentLoop]);

  // The analyser feeding the tuner follows the selected pad
  useEffect(() => {
    engine.send({ type: "setTunerPad", padId: selectedSampleId });
    return () => engine.send({ type: "setTunerPad", padId: null });
  }, [engine, selectedSampleId]);

  const setAllSampleData = useCallback<
    React.Dispatch<React.SetStateAction<Record<string, SampleTypeFE>>>
  >((action) => store.updateSamples((prev) => resolveAction(action, prev)), [store]);

  const setAllLoopSettings = useCallback<
    React.Dispatch<React.SetStateAction<AllLoopSettingsFE>>
  >((action) => store.updateLoops((prev) => resolveAction(action, prev)), [store]);

  const updateSamplerStateSettings = useCallback(
    (id: string, settings: Partial<SampleSettingsFE>) =>
      store.setPadSettings(id, settings),
    [store]
  );

  // Replace one pad's data whole
  const updateSamplerData = useCallback(
    (id: string, data: SampleTypeFE) => store.updatePad(id, () => data),
    [store]
  );

  return (
    <AudioContextContext.Provider
      value={{
        songTitle,
        setSongTitle,
        songId,
        setSongId,
        samplersLoading,
        currentLoop,
        setCurrentLoop,
        loopIsPlaying,
        isRecording,
        setAllLoopSettings,
        initLocSampleData,
        initKitSampleData,
        initLocSamplesFromOneCollection,
        initLocSamplesFromAllCollections,
        initKitSamples,
        updateSamplerData,
        updateSamplerStateSettings,
        setAllSampleData,
        selectedSampleId,
        setSelectedSampleId,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => {
  const context = useContext(AudioContextContext);
  if (!context) {
    throw new Error(
      "useAudioContext must be used within an AudioContextProvider"
    );
  }
  return context;
};
