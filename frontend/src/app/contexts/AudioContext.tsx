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
  SampleType,
  SampleSettings,
  LoopName,
  AllLoopSettings,
} from "../../../../shared/types/audioTypes";
import { SamplerWithFX } from "frontend/src/types/SamplerWithFX";
import { CustomSampler } from "frontend/src/types/CustomSampler";
import { getCollectionArrayFromName, UrlEntry } from "../../lib/collections";
import { allUrlsWithCollectionNames } from "frontend/src/lib/sampleSources";
import { getTitle, getLabel } from "../functions/getTitle";
import metronome from "../metronome";
// import axios from "axios";

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:8000";

// /////////////////
// const now = new Date();
// const nowMilliseconds =
//   now.getHours() * 3600 +
//   now.getMinutes() * 60 +
//   now.getSeconds() +
//   now.getMilliseconds() / 1000;
// ////////////////

type AudioContextType = {
  songTitle: string;
  setSongTitle: React.Dispatch<React.SetStateAction<string>>;
  songId: string;
  setSongId: React.Dispatch<React.SetStateAction<string>>;
  masterGainNode: React.RefObject<Tone.Gain>;
  setMasterGainLevel: React.Dispatch<React.SetStateAction<number>>;
  metronomeActive: boolean;
  setMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  metronome: Tone.Sampler;
  samplersRef: React.RefObject<Record<string, SamplerWithFX>>;
  makeSamplerWithFX: (
    sampleId: string,
    sampleUrl: string,
    offline?: boolean
  ) => Promise<SamplerWithFX>;
  initLocSampleData: (
    id: string,
    url: string,
    collection: string
  ) => SampleType;
  updateSamplerData: (id: string, data: SampleType) => void;
  currentLoop: string;
  setCurrentLoop: React.Dispatch<React.SetStateAction<string>>;
  loopIsPlaying: boolean;
  setLoopIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  allLoopSettings: AllLoopSettings;
  setAllLoopSettings: React.Dispatch<React.SetStateAction<AllLoopSettings>>;
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  allSampleData: Record<string, SampleType>;
  setAllSampleData: React.Dispatch<
    React.SetStateAction<Record<string, SampleType>>
  >;
  updateSamplerStateSettings: (
    id: string,
    settings: Partial<SampleSettings>
  ) => void;
  selectedSampleId: string;
  setSelectedSampleId: React.Dispatch<React.SetStateAction<string>>;
  solosExist: boolean;
  initLocSamplesFromOneCollection: (
    collection: string
  ) => Record<string, SampleType>;
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
  ): SampleType => {
    return {
      id: id,
      title: getTitle(url),
      type: "loc",
      collectionName: collection,
      label: getLabel(url),
      url: url,
      events: { A: [], B: [], C: [], D: [] },
      settings: {
        mute: false,
        solo: false,
        reverse: false,
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
      },
      attribution: "",
    };
  };

  //
  const initLocSamplesFromAllCollections = () => {
    try {
      const selectedSamples = selectRandomUrlEntries(
        allUrlsWithCollectionNames
      ) as UrlEntry[];

      const locSampleData = selectedSamples.reduce(
        (acc, sample, i) => {
          const key = `pad-${i + 1}`;
          acc[key] = initLocSampleData(key, sample.url, sample.collection);
          return acc;
        },
        {} as Record<string, SampleType>
      );

      return locSampleData;
    } catch (error) {
      console.error("Error fetching samples:", error);
      return {};
    }
  };

  const initLocSamplesFromOneCollection = (collection: string) => {
    try {
      const selectedSamples = selectRandomUrlEntries(
        getCollectionArrayFromName(collection)
      ) as string[];

      const locSampleData = selectedSamples.reduce(
        (acc, url, i) => {
          const key = `pad-${i + 1}`;
          acc[key] = initLocSampleData(key, url, collection);
          return acc;
        },
        {} as Record<string, SampleType>
      );

      return locSampleData;
    } catch (error) {
      console.error("Error fetching samples:", error);
      return {};
    }
  };

  const initKitSampleData = (
    id: string,
    url: string,
    title: string,
    label: string,
    collection: string
  ): SampleType => {
    return {
      id: id,
      title: title,
      type: "kit",
      collectionName: collection,
      label: label,
      url: url,
      events: { A: [], B: [], C: [], D: [] },
      settings: {
        mute: false,
        solo: false,
        reverse: false,
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
      },
      attribution: "",
    };
  };

  const initKitSamples = () => {
    const samples = [
      {
        title: "Kick_Bulldog_2",
        url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
        collection: "Kit",
      },
      {
        title: "Snare_Astral_1",
        url: "/samples/drums/snares/Snare_Astral_1.wav",
        collection: "Kit",
      },
      {
        title: "ClosedHH_Alessya_DS",
        url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
        collection: "Kit",
      },
      {
        title: "Clap_Graphite",
        url: "/samples/drums/claps/Clap_Graphite.wav",
        collection: "Kit",
      },
    ];

    return samples.reduce(
      (acc, sample, index) => {
        const id = `pad-${index + 13}`;
        const label = sample.title.split("_").slice(0)[0];
        acc[id] = initKitSampleData(
          id,
          sample.url,
          sample.title,
          label,
          sample.collection
        );
        return acc;
      },
      {} as Record<string, SampleType>
    );
  };

  // Function to create a sampler with FX chain.
  // If using with Tone.Offline to download WAV stems, the third argument should be "true".
  const makeSamplerWithFX = async (
    sampleId: string,
    sampleUrl: string,
    offline: boolean = false
  ): Promise<SamplerWithFX> => {
    return new Promise((resolve, reject) => {
      const gain = new Tone.Gain(1); // Strictly for the purpose of controlling muting or soloing tracks
      const pitch = new Tone.PitchShift(0);
      const panVol = new Tone.PanVol(0, 0);
      const highpass = new Tone.Filter(0, "highpass");
      const lowpass = new Tone.Filter(20000, "lowpass");
      const sampler = new CustomSampler({
        urls: { C4: sampleUrl },
        onload: () => {
          // Connect the FX chain
          sampler.connect(gain);
          gain.connect(pitch);
          pitch.connect(highpass);
          highpass.connect(lowpass);
          lowpass.connect(panVol);

          if (!offline) {
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
        },
        onerror: (err) => {
          console.error(`Error loading sample: ${sampleId}`, err);
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

  // // Function for loading samplers
  // const loadSamplers = useCallback(
  //   async (type: "loc" | "kit") => {
  //     if (!allSampleData) return;
  //     // Filter the sample data based on the type
  //     const samplesArray = Object.entries(allSampleData)
  //       .filter(([key]) => key.startsWith(`${type}-`))
  //       .map(([, value]) => value);

  //     const samplers = await Promise.all(
  //       samplesArray.map(async ({ id, url }) => await makeSamplerWithFX(id, url))
  //     );

  //     samplers.forEach((sampler, i) => {
  //       const id = samplesArray[i].id;
  //       samplersRef.current[id] = sampler;
  //     });
  //   },
  //   [allSampleData]
  // );

  const loadSamplersToRef = async (
    allSampleData: Record<string, SampleType>
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
    Record<string, SampleType>
  >(() => {
    const savedSamples = localStorage.getItem("samples");
    return savedSamples
      ? JSON.parse(savedSamples)
      : {
          ...initLocSamplesFromAllCollections(),
          ...initKitSamples(),
        };
  });
  const [allLoopSettings, setAllLoopSettings] = useState<AllLoopSettings>(
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
    settings: Partial<SampleSettings>
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

  // use axios to post song to db

  // // Load samplers to samplerRef
  // useEffect(() => {
  //   loadSamplers("loc");
  //   loadSamplers("kit");
  // }, []); // <===== if this empty dependency array is removed, the samplers are loaded with every update in allSampleData state

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

  // Schedule metronome playback based on time signature
  useEffect(() => {
    // beatsCount will increment to keep track of when down-beat or off-beat should play
    let beatCount = 0;

    const metronomeLoop = Tone.getTransport().scheduleRepeat((time) => {
      if (!loopIsPlaying || !metronomeActive) return;

      const [, beats] = (Tone.getTransport().position as string)
        .split(":")
        .map(Number);
      beatCount = beats % allLoopSettings[currentLoop as LoopName]!.beats;

      if (beatCount === 0) {
        metronome.triggerAttackRelease("C6", "8n", time);
      } else {
        metronome.triggerAttackRelease("G5", "8n", time);
      }
    }, "4n");

    const transportForCleanup = Tone.getTransport();

    return () => {
      transportForCleanup.clear(metronomeLoop);
    };
  }, [loopIsPlaying, metronomeActive, allLoopSettings, currentLoop]);

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
  }, [allLoopSettings, currentLoop]);

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
  const updateSamplerData = (id: string, data: SampleType): void => {
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
        metronome,
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
        updateSamplerData,
        allSampleData,
        updateSamplerStateSettings,
        setAllSampleData,
        selectedSampleId,
        setSelectedSampleId,
        samplersRef,
        solosExist,
        initLocSamplesFromOneCollection,
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
