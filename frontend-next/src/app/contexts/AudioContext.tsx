"use client";
import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import * as Tone from "tone";
import {
  SampleTypeFE,
  SampleSettingsFE,
  AllLoopSettingsFE,
} from "src/types/audioTypesFE";
import { useUIContext } from "./UIContext";
import { LoopName } from "../../types/audioTypes";
import { emptyLoopEvents } from "src/lib/constants/loops";
import { readJSON, readString, writeJSON, writeString } from "src/lib/storage";
import {
  DEFAULT_SELECTED_PAD,
  KIT_PAD_IDS,
  LOC_PAD_COUNT,
  padId,
} from "src/lib/constants/padLayout";
import { defaultLoopSettings, defaultSampleSettings } from "src/lib/audio/defaults";
import { SamplerWithFX } from "src/types/SamplerWithFX";
import { CustomSampler } from "src/types/CustomSampler";
import {
  getCollectionArrayFromName,
  UrlEntry,
} from "../../lib/loc_collections";
import { allUrlsWithCollectionNames } from "src/lib/loc_sample_sources";
import { getTitle } from "../../lib/getTitle";
import {
  drumMachines,
  DrumMachineId,
  getKitSampleTitle,
  drumUrl,
  migrateDrumUrls,
} from "../../lib/drumMachines";
import { set, get } from "idb-keyval"; // for IndexedDB storage
import { computeGain, normalizeAllMuteSolo } from "../../lib/audio/muteSolo";
import { applySoundSettings } from "../../lib/audio/applySoundSettings";
import { applyLoopSettings } from "../../lib/audio/applyLoopSettings";

type AudioContextType = {
  songTitle: string;
  setSongTitle: React.Dispatch<React.SetStateAction<string>>;
  songId: string;
  setSongId: React.Dispatch<React.SetStateAction<string>>;
  masterGainNode: React.RefObject<Tone.Gain>;
  setMasterGainLevel: React.Dispatch<React.SetStateAction<number>>;
  metronomeActive: boolean;
  setMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  samplersRef: React.RefObject<Record<string, SamplerWithFX>>;
  // Snapshot of samplersRef for render; updated after samplers load
  samplers: Record<string, SamplerWithFX>;
  samplersLoading: boolean;
  setSamplersLoading: React.Dispatch<React.SetStateAction<boolean>>;
  makeSamplerWithFX: (
    sampleId: string,
    sampleUrl: string,
    stems?: boolean
  ) => Promise<SamplerWithFX>;

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
  loadSamplersToRef: (
    sampleData: Record<string, SampleTypeFE>
  ) => Promise<void>;
  storeAudioInIndexedDB: (url: string, sampleId: string) => Promise<void>;
  getCachedAudioUrlFromIndexedDB: (
    sampleId: string,
    currentUrl: string
  ) => Promise<string | null>;
  currentLoop: LoopName;
  setCurrentLoop: React.Dispatch<React.SetStateAction<LoopName>>;
  loopIsPlaying: boolean;
  setLoopIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  allLoopSettings: AllLoopSettingsFE;
  setAllLoopSettings: React.Dispatch<React.SetStateAction<AllLoopSettingsFE>>;
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  allSampleData: Record<string, SampleTypeFE>;
  setAllSampleData: React.Dispatch<
    React.SetStateAction<Record<string, SampleTypeFE>>
  >;
  updateSamplerStateSettings: (
    id: string,
    settings: Partial<SampleSettingsFE>
  ) => void;
  selectedSampleId: string;
  setSelectedSampleId: React.Dispatch<React.SetStateAction<string>>;
  solosExist: boolean;
  initLocSamplesFromOneCollection: (
    collection: string
  ) => Record<string, SampleTypeFE>;
  initLocSamplesFromAllCollections: () => Record<string, SampleTypeFE>;
  cleanupSampler: (
    id: string,
    ref: React.RefObject<Record<string, SamplerWithFX>>
  ) => void;
};

const AudioContextContext = createContext<AudioContextType | null>(null);

export const AudioProvider = ({ children }: React.PropsWithChildren) => {
  // Select 8 random urls from the allLOCUrls array
  const selectRandomUrlEntries = (
    array: UrlEntry[] | string[],
    collection?: string
  ): UrlEntry[] | string[] => {
    // Fisher-Yates algorithm to shuffle the array into random order
    let workingArray: UrlEntry[] | string[];

    // If it's a string array and collection is defined, override with collection array
    if (typeof array[0] === "string" && collection) {
      workingArray = getCollectionArrayFromName(collection);
    } else {
      workingArray = [...array] as UrlEntry[];
    }

    // Shuffle and return k elements
    const n = workingArray.length;
    const k = Math.min(LOC_PAD_COUNT, n);

    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (n - i));
      [workingArray[i], workingArray[j]] = [workingArray[j], workingArray[i]];
    }

    return workingArray.slice(0, k);
  };

  // Format state data for a given loc sampler
  const initLocSampleData = (
    id: string,
    url: string,
    collection: string
  ): SampleTypeFE => {
    return {
      id: id,
      title: getTitle(url),
      type: "loc",
      collectionName: collection,
      url: url,
      events: emptyLoopEvents(),
      settings: defaultSampleSettings(),
      attribution: "",
    };
  };

  // Initialize loc samples data from all collections
  const initLocSamplesFromAllCollections = () => {
    const selectedSamples = selectRandomUrlEntries(
      allUrlsWithCollectionNames
    ) as UrlEntry[];

    const locSampleData = selectedSamples.reduce(
      (acc, sample, i) => {
        const key = padId(i + 1);
        acc[key] = initLocSampleData(key, sample.url, sample.collection);
        return acc;
      },
      {} as Record<string, SampleTypeFE>
    );

    return locSampleData;
  };

  // Initialize loc samples data from one collection
  const initLocSamplesFromOneCollection = (collection: string) => {
    const selectedSamples = selectRandomUrlEntries(
      getCollectionArrayFromName(collection)
    ) as string[];

    const locSampleData = selectedSamples.reduce(
      (acc, url, i) => {
        const key = padId(i + 1);
        acc[key] = initLocSampleData(key, url, collection);
        return acc;
      },
      {} as Record<string, SampleTypeFE>
    );

    return locSampleData;
  };

  // Format state data for a given kit sample
  const initKitSampleData = (
    id: string,
    url: string,
    title: string,
    drumMachine: string
  ): SampleTypeFE => {
    return {
      id: id,
      title: title,
      type: "kit",
      collectionName: drumMachine,
      url: url,
      events: emptyLoopEvents(),
      settings: defaultSampleSettings(),
    };
  };

  // Initialize kit samples data for a given drum machine
  const initKitSamples = (
    machineId: DrumMachineId
  ): Record<string, SampleTypeFE> => {
    const formatSampleHeaders = (
      machineId: DrumMachineId,
      type: string
    ): { title: string; url: string; collection: string } => {
      const fileName = drumMachines[machineId].samples.find((sample: string) =>
        sample.includes(`${type}`)
      );
      if (!fileName) {
        throw new Error(`No ${type} sample found for machine ${machineId}`);
      }
      const url = drumUrl(fileName);
      const collection = drumMachines[machineId].name;
      const title = getKitSampleTitle(fileName);

      return { title, url, collection };
    };

    const samples = [
      formatSampleHeaders(machineId, "kick"),
      formatSampleHeaders(machineId, "snare"),
      formatSampleHeaders(machineId, "hat"),
      formatSampleHeaders(machineId, "rim"),
    ];

    return samples.reduce(
      (acc, sample, index) => {
        const id = KIT_PAD_IDS[index];
        acc[id] = initKitSampleData(
          id,
          sample.url,
          sample.title,
          sample.collection
        );
        return acc;
      },
      {} as Record<string, SampleTypeFE>
    );
  };

  const storeAudioInIndexedDB = useCallback(async (url: string, sampleId: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      const blob = await response.blob();
      await set(`audio-${sampleId}`, { url: url, blob }); // Store Blob directly to IndexedDB
    } catch (error) {
      console.error("Failed to store audio in IndexedDB:", error);
    }
  }, []);

  const getCachedAudioUrlFromIndexedDB = useCallback(async (
    sampleId: string,
    currentUrl: string // <-- pass in the current URL to compare
  ): Promise<string | null> => {
    const cached = await get<{ url: string; blob: Blob }>(`audio-${sampleId}`);
    if (!cached) return null;

    const { url, blob } = cached;

    // Check if the cached URL matches the current URL
    // This is important to ensure we don't return an outdated URL
    if (url !== currentUrl) {
      console.log("Cached URL is outdated. Expected:", currentUrl, "Got:", url);
      return null;
    }

    return URL.createObjectURL(blob);
  }, []);

  const { makeBeatsButtonPressed, setMakeBeatsButtonPressed } = useUIContext();
  const [samplersLoading, setSamplersLoading] = useState<boolean>(true);

  // Function to create a sampler with FX chain.
  // If using with Tone.Offline to download WAV stems, the third argument should be "true".
  const makeSamplerWithFX = (
    sampleId: string,
    sampleUrl: string,
    stems: boolean = false
  ): Promise<SamplerWithFX> => {
    return new Promise(async (resolve, reject) => {
      // Only set loading state for non-stems (UI) samplers
      if (!stems) {
        setSamplersLoading(true);
      }

      const gain = new Tone.Gain(1); // Strictly for the purpose of controlling muting or soloing tracks
      const pitch = new Tone.PitchShift(0);
      const panVol = new Tone.PanVol(0, 0);
      const highpass = new Tone.Filter(0, "highpass");
      const lowpass = new Tone.Filter(20000, "lowpass");
      const analyser = new Tone.Analyser("fft", 4096);

      // Check if the sample is cached in IndexedDB by matching the url
      const cached = await getCachedAudioUrlFromIndexedDB(sampleId, sampleUrl);

      const sampler = new CustomSampler({
        urls: { C4: cached ?? sampleUrl },
        onload: async () => {
          try {
            // Connect the FX chain
            sampler.connect(gain);
            gain.connect(pitch);
            gain.connect(analyser); // side-chain tap BEFORE PitchShift to eliminate phase-vocoder latency
            pitch.connect(highpass);
            highpass.connect(lowpass);
            lowpass.connect(panVol);

            if (!stems) {
              panVol.connect(masterGainNode.current).toDestination();
            } else {
              panVol.toDestination();
            }

            const samplerWithFX = {
              id: sampleId,
              sampler,
              pitch,
              gain,
              panVol,
              highpass,
              lowpass,
              analyser,
              currentEvent: {
                startTime: null,
                duration: null,
                note: "C4",
                velocity: 1,
              },
              triggerTime: null,
            };

            await Tone.loaded();

            if (makeBeatsButtonPressed) {
              setMakeBeatsButtonPressed(false);
            }

            // Clear loading state for UI samplers
            if (!stems) {
              setSamplersLoading(false);
            }

            resolve(samplerWithFX);
          } catch (error) {
            // Clear loading state on error for UI samplers
            if (!stems) {
              setSamplersLoading(false);
            }
            reject(error);
          }
        },
        onerror: (err) => {
          console.error(`Error loading sample: ${sampleId}`, err);
          // Clear loading state on error for UI samplers
          if (!stems) {
            setSamplersLoading(false);
          }
          reject(err);
        },
      });
    });
  };

  // Universal cleanup function for samplers
  const cleanupSampler = (
    sampleId: string,
    ref: React.RefObject<Record<string, SamplerWithFX>>
  ) => {
    const samplerWithFX = ref.current[sampleId];
    if (samplerWithFX) {
      const { sampler, gain, panVol, highpass, lowpass } = samplerWithFX;

      // Dispose of each Tone.js node
      sampler.dispose();
      gain.dispose();
      panVol.dispose();
      highpass.dispose();
      lowpass.dispose();

      // Delete the reference
      delete ref.current[sampleId];
    }
  };

  const [songTitle, setSongTitle] = useState<string>(() => {
    return readString("songTitle") ?? "Song001";
  });
  const [songId, setSongId] = useState<string>(() => {
    return readString("songId") ?? "";
  });
  const [allSampleData, setAllSampleData] = useState<
    Record<string, SampleTypeFE>
  >(() => {
    const savedSamples = readJSON<Record<string, SampleTypeFE>>("samples");
    return savedSamples
      ? normalizeAllMuteSolo(migrateDrumUrls(savedSamples))
      : {
          ...initLocSamplesFromAllCollections(),
          ...initKitSamples("mpc"),
        };
  });
  const [allLoopSettings, setAllLoopSettings] = useState<AllLoopSettingsFE>(
    () => {
      return readJSON<AllLoopSettingsFE>("loops") ?? defaultLoopSettings();
    }
  );

  const samplersRef = useRef<Record<string, SamplerWithFX>>({});
  const [samplers, setSamplers] = useState<Record<string, SamplerWithFX>>({});

  const loadSamplersToRef = async (
    sampleData: Record<string, SampleTypeFE>
  ) => {
    setSamplersLoading(true);

    try {
      // Clean up existing samplers first
      Object.keys(sampleData).forEach((key) => {
        cleanupSampler(key, samplersRef);
      });
      // Drop the disposed samplers from render state too, so pads go silent
      // while loading instead of triggering a disposed sampler
      setSamplers({ ...samplersRef.current });

      // Create all samplers concurrently
      const samplerPromises = Object.entries(sampleData).map(
        async ([key, sample]) => {
          const sampler = await makeSamplerWithFX(sample.id, sample.url);
          return { key, sampler };
        }
      );

      // Wait for all samplers to be created
      const newSamplers = await Promise.all(samplerPromises);

      // Assign samplers to ref and apply settings. Mute/solo gain is set by
      // the gain effect, which reruns when the samplers state changes.
      newSamplers.forEach(({ key, sampler }) => {
        samplersRef.current[key] = sampler;
        applySoundSettings(sampler, sampleData[key].settings);
      });
      setSamplers({ ...samplersRef.current });
    } catch (error) {
      console.error("Failed to load samplers:", error);
    } finally {
      setSamplersLoading(false);
    }
  };

  const [loopIsPlaying, setLoopIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [currentLoop, setCurrentLoop] = useState<LoopName>("A");
  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const masterGainNode = useRef<Tone.Gain>(
    new Tone.Gain(masterGainLevel).toDestination()
  );
  const [selectedSampleId, setSelectedSampleId] = useState<string>(DEFAULT_SELECTED_PAD);

  const updateSamplerStateSettings = (
    id: string,
    settings: Partial<SampleSettingsFE>
  ): void => {
    setAllSampleData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        settings: {
          ...prev[id].settings,
          ...settings,
        },
      },
    }));
  };

  // Load samplers to samplerRef and waveform peaks to localStorage
  useEffect(() => {
    loadSamplersToRef(allSampleData);
    // Store sample audio for each sample in Indexed DB
    Object.entries(allSampleData).forEach(([id, sample]) => {
      if (sample.url) {
        storeAudioInIndexedDB(sample.url, id);
      }
    });
  }, []); // <===== if this empty dependency array is removed, the samplers are loaded with every update in allSampleData state

  // This provider is the only writer of the song keys in localStorage.
  // Changes in state coming from SampleSettings are debounced in that component.
  useEffect(() => {
    writeJSON("samples", allSampleData);
  }, [allSampleData]);

  useEffect(() => {
    writeString("songTitle", songTitle);
  }, [songTitle]);

  // An empty songId means the song is not saved yet, and clears the key
  useEffect(() => {
    writeString("songId", songId);
  }, [songId]);

  // Upload allLoopSettings with debounce to localStorage.loops when allLoopSettings state changes.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      writeJSON("loops", allLoopSettings);
    }, 500);

    return () => {
      clearTimeout(timeoutId); // cancel if settings change before debounceDelay
      writeJSON("loops", allLoopSettings);
    };
  }, [allLoopSettings]);

  // Start Tone.js context once
  useEffect(() => {
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
    };
    init();
  }, []);

  // The one owner of the live transport's loop setup. Runs when the loop
  // changes or when its tempo, swing, meter or length is edited.
  const currentLoopSettings = allLoopSettings[currentLoop];
  useEffect(() => {
    if (!currentLoopSettings) return;
    applyLoopSettings(Tone.getTransport(), currentLoopSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentLoop,
    currentLoopSettings?.bpm,
    currentLoopSettings?.swing,
    currentLoopSettings?.beats,
    currentLoopSettings?.bars,
  ]);

  // Restart from the top when switching to a different loop
  useEffect(() => {
    const transport = Tone.getTransport();
    const wasPlaying = transport.state === "started";
    if (wasPlaying) {
      transport.stop();
      transport.position = "0:0:0";
      transport.start();
    } else {
      transport.position = "0:0:0";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLoop]);

  // Cleanup effect for samplers when component unmounts
  useEffect(() => {
    const samplersForCleanup = samplersRef.current;
    return () => {
      // Cleanup library of congress samplers
      Object.keys(samplersForCleanup).forEach((sampleId) => {
        cleanupSampler(sampleId, samplersRef);
      });
    };
  }, []);

  // Update one sampler's data (entire) whenever anything inside that sampler's data changes
  const updateSamplerData = (id: string, data: SampleTypeFE): void => {
    setAllSampleData((prev) => ({
      ...prev,
      [id]: data,
    }));
  };

  // Derived from allSampleData, so it can't drift out of sync
  const solosExist = useMemo(
    () => Object.values(allSampleData).some((sample) => sample.settings.solo),
    [allSampleData]
  );

  // Sampler audio output based on mutes and solos:
  useEffect(() => {
    Object.keys(allSampleData).forEach((id) => {
      const sampler = samplersRef.current[id];
      if (!sampler) return;

      sampler.gain.gain.value = computeGain(
        allSampleData[id].settings,
        solosExist
      );
    });
  }, [allSampleData, solosExist, samplers]);


  return (
    <AudioContextContext.Provider
      value={{
        songTitle,
        setSongTitle,
        songId,
        setSongId,
        masterGainNode,
        setMasterGainLevel,
        metronomeActive,
        setMetronomeActive,
        currentLoop,
        setCurrentLoop,
        loopIsPlaying,
        setLoopIsPlaying,
        allLoopSettings,
        setAllLoopSettings,
        isRecording,
        setIsRecording,
        samplersLoading,
        setSamplersLoading,
        loadSamplersToRef,
        makeSamplerWithFX,
        storeAudioInIndexedDB,
        getCachedAudioUrlFromIndexedDB,
        initLocSampleData,
        initKitSampleData,
        initLocSamplesFromOneCollection,
        initLocSamplesFromAllCollections,
        initKitSamples,
        updateSamplerData,
        allSampleData,
        updateSamplerStateSettings,
        setAllSampleData,
        selectedSampleId,
        setSelectedSampleId,
        samplersRef,
        samplers,
        solosExist,

        cleanupSampler,
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
