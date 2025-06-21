"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  // useMemo,
} from "react";
import * as Tone from "tone";
import {
  SampleTypeFE,
  SampleSettingsFE,
  AllLoopSettingsFE,
} from "src/types/audioTypesFE";
import { useUIContext } from "./UIContext";
import { LoopName } from "../../../../shared/types/audioTypes";
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
} from "../../lib/drumMachines";
import dotenv from "dotenv";
dotenv.config();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  currentLoop: string;
  setCurrentLoop: React.Dispatch<React.SetStateAction<string>>;
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
    const k = Math.min(12, n);

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
      events: { A: [], B: [], C: [], D: [] },
      settings: {
        mute: false,
        solo: false,
        reverse: false,
        timeStretch: false,
        oneShot: false,
        loop: false,
        start: 0,
        end: null,
        volume: 0,
        pan: 0,
        baseNote: "C4",
        pitch: 0,
        attack: 0,
        release: 0,
        quantize: false,
        quantVal: 4,
        highpass: [0, "highpass"] as [number, "highpass"],
        lowpass: [20000, "lowpass"] as [number, "lowpass"],
        ui: { zoom: 0, seekTo: 0 },
      },
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
        const key = `pad-${i + 1}`;
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
        const key = `pad-${i + 1}`;
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
      events: { A: [], B: [], C: [], D: [] },
      settings: {
        mute: false,
        solo: false,
        reverse: false,
        timeStretch: false,
        oneShot: false,
        loop: false,
        start: 0,
        end: null,
        volume: 0,
        pan: 0,
        baseNote: "C4",
        pitch: 0,
        attack: 0,
        release: 0,
        quantize: false,
        quantVal: 4,
        highpass: [0, "highpass"] as [number, "highpass"],
        lowpass: [20000, "lowpass"] as [number, "lowpass"],
        ui: { zoom: 0, seekTo: 0 },
      },
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
      const url = `${API_BASE_URL}/beats/drums/${fileName}`;
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
        const id = `pad-${index + 13}`;
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

  const { makeBeatsButtonPressed, setMakeBeatsButtonPressed } = useUIContext();

  // Function to create a sampler with FX chain.
  // If using with Tone.Offline to download WAV stems, the third argument should be "true".
  const makeSamplerWithFX = async (
    sampleId: string,
    sampleUrl: string,
    stems: boolean = false
  ): Promise<SamplerWithFX> => {
    return new Promise(async (resolve, reject) => {
      const gain = new Tone.Gain(1); // Strictly for the purpose of controlling muting or soloing tracks
      const pitch = new Tone.PitchShift(0);
      const panVol = new Tone.PanVol(0, 0);
      const highpass = new Tone.Filter(0, "highpass");
      const lowpass = new Tone.Filter(20000, "lowpass");
      const sampler = new CustomSampler({
        urls: { C4: sampleUrl },
        onload: async () => {
          // Connect the FX chain
          sampler.connect(gain);
          gain.connect(pitch);
          pitch.connect(highpass);
          highpass.connect(lowpass);
          lowpass.connect(panVol);

          if (!stems) {
            panVol.connect(masterGainNode.current).toDestination();
          } else {
            panVol.toDestination();
          }
          resolve({
            id: sampleId,
            sampler,
            pitch,
            gain,
            panVol,
            highpass,
            lowpass,
            currentEvent: {
              startTime: null,
              duration: null,
              note: "C4",
              velocity: 1,
            },
          });
          await Tone.loaded();

          if (makeBeatsButtonPressed) {
            setMakeBeatsButtonPressed(false);
          }
        },
        onerror: (err) => {
          console.error(`Error loading sample: ${sampleId}`, err);
          reject(err);
          // Wait for all samples to load
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

  const loadSamplersToRef = async (
    allSampleData: Record<string, SampleTypeFE>
  ) => {
    if (!allSampleData) return;
    const samplesArray = Object.values(allSampleData).map((value) => {
      return value;
    });
    const samplers = await Promise.all(
      samplesArray.map(async ({ id, url }) => {
        const samplerWithFX = await makeSamplerWithFX(id, url);
        return samplerWithFX;
      })
    );

    samplers.forEach((sampler, i) => {
      const id = samplesArray[i].id;
      samplersRef.current[id] = sampler;
    });
  };

  const [songTitle, setSongTitle] = useState<string>(() => {
    const savedSongTitle = localStorage.getItem("songTitle");
    return savedSongTitle ? JSON.parse(savedSongTitle) : "Song001";
  });
  const [songId, setSongId] = useState<string>(() => {
    const savedSongId = localStorage.getItem("songId");
    return savedSongId ? savedSongId : "";
  });
  const [allSampleData, setAllSampleData] = useState<
    Record<string, SampleTypeFE>
  >(() => {
    const savedSamples = localStorage.getItem("samples");
    return savedSamples
      ? JSON.parse(savedSamples)
      : {
          ...initLocSamplesFromAllCollections(),
          ...initKitSamples("mpc"),
        };
  });
  const [allLoopSettings, setAllLoopSettings] = useState<AllLoopSettingsFE>(
    () => {
      const savedLoops = localStorage.getItem("loops");
      return savedLoops
        ? JSON.parse(savedLoops)
        : {
            A: { beats: 4, bars: 2, bpm: 120, swing: 0 },
            B: null,
            C: null,
            D: null,
          };
    }
  );

  const samplersRef = useRef<Record<string, SamplerWithFX>>({});
  const [loopIsPlaying, setLoopIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [currentLoop, setCurrentLoop] = useState<string>("A");
  // const lastLoopRef = useRef<LoopName>("A");

  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const masterGainNode = useRef<Tone.Gain>(
    new Tone.Gain(masterGainLevel).toDestination()
  );
  const [selectedSampleId, setSelectedSampleId] = useState<string>("pad-1");
  const [solosExist, setSolosExist] = useState<boolean>(false);

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

  // Listen for user interaction to start the audio context
  useEffect(() => {
    const initializeAudio = async () => {
      // Initialize on ANY user interaction, not just your buttons
      const handleFirstInteraction = async () => {
        if (Tone.getContext().state !== "running") {
          await Tone.start();
          console.log("Audio context started");
        }
        // Remove listeners after first successful start
        document.removeEventListener("click", handleFirstInteraction);
        document.removeEventListener("touchstart", handleFirstInteraction);
        document.removeEventListener("keydown", handleFirstInteraction);
      };

      // Listen for ANY user interaction
      document.addEventListener("click", handleFirstInteraction, {
        passive: true,
      });
      document.addEventListener("touchstart", handleFirstInteraction, {
        passive: true,
      });
      document.addEventListener("keydown", handleFirstInteraction, {
        passive: true,
      });
    };

    initializeAudio();
  }, []);

  // Load samplers to samplerRef
  useEffect(() => {
    loadSamplersToRef(allSampleData);
  }, []); // <===== if this empty dependency array is removed, the samplers are loaded with every update in allSampleData state

  // Upload allSampleData to localStorage.samples when allSampleData state changes.
  // Changes in state coming from SampleSettings are debounced in that component.
  useEffect(() => {
    localStorage.setItem("samples", JSON.stringify(allSampleData));
  }, [allSampleData]);

  // Upload songTitle to localStorage.songTitle when songTitle state changes
  useEffect(() => {
    localStorage.setItem("songTitle", JSON.stringify(songTitle));
  }, [songTitle]);

  // Upload allLoopSettings with debounce to localStorage.loops when allLoopSettings state changes.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("loops", JSON.stringify(allLoopSettings));
    }, 500);

    return () => {
      clearTimeout(timeoutId); // cancel if settings change before debounceDelay
      localStorage.setItem("loops", JSON.stringify(allLoopSettings));
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

  // Update ToneJS Transport when currentLoop changes
  useEffect(() => {
    const transport = Tone.getTransport();
    const settings = allLoopSettings[currentLoop as LoopName];
    if (!settings) return;

    transport.bpm.value = settings.bpm;
    transport.timeSignature = settings.beats;
    transport.loop = true;
    transport.loopStart = "0:0:0";
    transport.loopEnd = `${settings.bars}:0:0`;

    // if (transport.state === "started") {
    //   transport.stop();
    //   transport.position = "0:0:0";
    //   transport.start();
    // }
  }, [allLoopSettings, currentLoop]);

  useEffect(() => {
    const transport = Tone.getTransport();
    const wasPlaying = transport.state === "started";

    if (wasPlaying) {
      transport.stop();
      transport.position = "0:0:0";
      transport.start();
    } else {
      transport.position = "0:0:0"; // reset for next play
    }
  }, [allLoopSettings]);

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
    //
  };

  // updates solosExist when a sampler's solo state changes
  useEffect(() => {
    if (!allSampleData) return;
    const solosExistNow = Object.values(allSampleData).some(
      (sample) => sample.settings.solo
    );
    setSolosExist(solosExistNow);
  }, [allSampleData]);

  // Sampler audio output based on mutes and solos:
  useEffect(() => {
    Object.keys(allSampleData).forEach((id) => {
      const sampler = samplersRef.current[id];
      if (!sampler) return;

      const { mute, solo } = allSampleData[id].settings;

      sampler.gain.gain.value = mute ? 0 : solosExist ? (solo ? 1 : 0) : 1;
    });
  }, [allSampleData, solosExist]);

  // if (!hasLoadedFromStorage.current) return null;

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
        makeSamplerWithFX,
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
