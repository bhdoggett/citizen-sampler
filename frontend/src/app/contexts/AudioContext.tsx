"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
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
import { UrlEntry } from "../../lib/collections";
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
  masterGainNode: React.RefObject<Tone.Gain>;
  setMasterGainLevel: React.Dispatch<React.SetStateAction<number>>;
  metronomeActive: boolean;
  setMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  metronome: Tone.Sampler;
  samplersRef: React.RefObject<Record<string, SamplerWithFX>>;
  makeSampler: (
    sampleId: string,
    sampleUrl: string,
    offline: boolean
  ) => Promise<SamplerWithFX>;
  initLocSampleData: (
    id: string,
    url: string,
    collection: string
  ) => SampleType;
  updateSamplerData: (id: string, data: SampleType) => void;
  handleSelectLoop: (loop: LoopName) => void;
  globalCollectionName: string;
  setGlobalCollectionName: React.Dispatch<React.SetStateAction<string>>;
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
};

const AudioContextContext = createContext<AudioContextType | null>(null);

export const AudioProvider = ({ children }: React.PropsWithChildren) => {
  /////////////////
  const now = new Date();
  const nowMilliseconds =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds() +
    now.getMilliseconds() / 1000;
  ////////////////

  // funciton to select 8 random urls from the allLOCUrls array
  const selectRandomUrlEntries = (array: UrlEntry[]): UrlEntry[] => {
    const arr = [...array]; // make a copy to avoid mutating the original
    const n = arr.length;
    const k = 8;

    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (n - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.slice(0, k);
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

  const initLocSamples = () => {
    try {
      const selectedSamples = selectRandomUrlEntries(
        allUrlsWithCollectionNames
      );

      // Reduce to an object keyed by the sample id
      const locSampleData = selectedSamples.reduce(
        (acc, sample, i) => {
          const key = `loc-${i + 1}`;
          acc[key] = initLocSampleData(key, sample.url, sample.collection);
          return acc;
        },
        {} as Record<string, SampleType>
      ); // Replace with actual type

      return locSampleData;
    } catch (error) {
      console.error("Error fetching samples:", error);
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
        collection: "kit",
      },
      {
        title: "Snare_Astral_1",
        url: "/samples/drums/snares/Snare_Astral_1.wav",
      },
      {
        title: "ClosedHH_Alessya_DS",
        url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
      },
      { title: "Clap_Graphite", url: "/samples/drums/claps/Clap_Graphite.wav" },
    ];

    return samples.reduce(
      (acc, sample, index) => {
        const id = `kit-${index + 1}`;
        const label = sample.title.split("_").slice(0)[0];
        acc[id] = initKitSampleData(id, sample.url, sample.title, label, "Kit");
        return acc;
      },
      {} as Record<string, SampleType>
    );
  };

  const [songTitle, setSongTitle] = useState<string>("Song001");
  const [allSampleData, setAllSampleData] = useState<
    Record<string, SampleType>
  >(() => {
    const saved = localStorage.getItem("samples");
    return saved
      ? JSON.parse(saved)
      : {
          ...initLocSamples(),
          ...initKitSamples(),
        };
  });
  const samplersRef = useRef<Record<string, SamplerWithFX>>({});
  const [globalCollectionName, setGlobalCollectionName] = useState<string>(
    "Inventing Entertainment"
  );

  const [loopIsPlaying, setLoopIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bars, setBars] = useState<number>(2);
  const [beatsPerBar, setBeatsPerBar] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(120);
  const [currentLoop, setCurrentLoop] = useState<string>("A");
  const lastLoopRef = useRef<LoopName>("A");
  const [allLoopSettings, setAllLoopSettings] = useState<AllLoopSettings>({
    A: { beats: beatsPerBar, bars, bpm },
    B: null,
    C: null,
    D: null,
  });
  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const masterGainNode = useRef<Tone.Gain>(
    new Tone.Gain(masterGainLevel).toDestination()
  );
  const [selectedSampleId, setSelectedSampleId] = useState<string>("loc-1");
  const [solosExist, setSolosExist] = useState<boolean>(false);

  // Function to create a sampler with FX chain.
  // If using with Tone.Offline to download WAV stems, the third argument should be "true".
  const makeSampler = async (
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
              // velocity: null,
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
      const { sampler, panVol, highpass, lowpass } = samplerWithFX;

      // Dispose of each Tone.js node
      sampler.dispose();
      panVol.dispose();
      highpass.dispose();
      lowpass.dispose();

      // Delete the reference
      delete ref.current[sampleId];
    }
  };

  // Update render state when different loops are selected
  const handleSelectLoop = (newLoop: LoopName) => {
    const settings = allLoopSettings;

    // Copy settings from the last loop if the first time selecting current loop
    if (!settings[newLoop]) {
      const lastLoop = lastLoopRef.current;
      const lastSettings = settings[lastLoop];
      if (lastSettings) {
        settings[newLoop] = { ...lastSettings };
      }
    }

    const currentSettings = settings[newLoop];
    if (currentSettings) {
      setBpm(currentSettings.bpm);
      setBeatsPerBar(currentSettings.beats);
      setBars(currentSettings.bars);
      setCurrentLoop(newLoop);
    }

    // Update last selected loop
    lastLoopRef.current = newLoop;
  };

  // Function for loading samplers
  const loadSamplers = useCallback(
    async (type: "loc" | "kit") => {
      if (!allSampleData) return;
      // Filter the sample data based on the type
      const samplesArray = Object.entries(allSampleData)
        .filter(([key]) => key.startsWith(`${type}-`))
        .map(([, value]) => value);

      const samplers = await Promise.all(
        samplesArray.map(async ({ id, url }) => await makeSampler(id, url))
      );

      samplers.forEach((sampler, i) => {
        const id = samplesArray[i].id;
        samplersRef.current[id] = sampler;
      });
    },
    [allSampleData]
  );

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

  // test allSampleData state
  useEffect(() => {
    if (allSampleData) {
      console.log("allSampleData", nowMilliseconds, allSampleData);
    }
  }, [allSampleData]);

  // useEffect(() => {
  //   if (!hasLoadedFromStorage || localStorage.tempSong) return;

  //   setKitSamples([
  //     {
  //       id: "kit-1",
  //       title: "Kick_Bulldog_2",
  //       collectionName: "Kit",
  //       label: "Kick",
  //       url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
  //       events: { A: [], B: [], C: [], D: [] },
  //       settings: {
  //         mute: false,
  //         solo: false,
  //         reverse: false,
  //         start: 0,
  //         end: null,
  //         volume: 0,
  //         pan: 0,
  //         baseNote: "C4",
  //         pitch: 0,
  //         attack: 0,
  //         release: 0,
  //         quantize: false,
  //         quantVal: 4,
  //         highpass: [0, "highpass"],
  //         lowpass: [20000, "lowpass"],
  //       },
  //     },
  //     {
  //       id: "kit-2",
  //       title: "Snare_Astral_1",
  //       collectionName: "Kit",
  //       url: "/samples/drums/snares/Snare_Astral_1.wav",
  //       events: { A: [], B: [], C: [], D: [] },
  //       settings: {
  //         mute: false,
  //         solo: false,
  //         reverse: false,
  //         start: 0,
  //         end: null,
  //         volume: 0,
  //         pan: 0,
  //         baseNote: "C4",
  //         pitch: 0,
  //         attack: 0,
  //         release: 0,
  //         quantize: false,
  //         quantVal: 4,
  //         highpass: [0, "highpass"],
  //         lowpass: [20000, "lowpass"],
  //       },
  //     },
  //     {
  //       id: "kit-3",
  //       title: "ClosedHH_Alessya_DS",
  //       collectionName: "Kit",
  //       url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
  //       events: { A: [], B: [], C: [], D: [] },
  //       settings: {
  //         mute: false,
  //         solo: false,
  //         reverse: false,
  //         start: 0,
  //         end: null,
  //         volume: 0,
  //         pan: 0,
  //         baseNote: "C4",
  //         pitch: 0,
  //         attack: 0,
  //         release: 0,
  //         quantize: false,
  //         quantVal: 4,
  //         highpass: [0, "highpass"],
  //         lowpass: [20000, "lowpass"],
  //       },
  //     },
  //     {
  //       id: "kit-4",
  //       title: "Clap_Graphite",
  //       collectionName: "Kit",
  //       url: "/samples/drums/claps/Clap_Graphite.wav",
  //       events: { A: [], B: [], C: [], D: [] },
  //       settings: {
  //         mute: false,
  //         solo: false,
  //         reverse: false,
  //         start: 0,
  //         end: null,
  //         volume: 0,
  //         pan: 0,
  //         baseNote: "C4",
  //         pitch: 0,
  //         attack: 0,
  //         release: 0,
  //         quantize: false,
  //         quantVal: 4,
  //         highpass: [0, "highpass"],
  //         lowpass: [20000, "lowpass"],
  //       },
  //     },
  //   ]);
  // }, [hasLoadedFromStorage]);

  // useEffect to upload allSampleData to localStorage.samples when allSampleData state changes
  useEffect(() => {
    localStorage.setItem("samples", JSON.stringify(allSampleData));
  }, [allSampleData]);

  // useEffect to upload songTitle to localStorage.songTitle when songTitle state changes
  useEffect(() => {
    localStorage.setItem("songTitle", JSON.stringify(songTitle));
  }, [songTitle]);

  // useEffect to upload allLoopSettings to localStorage.loops when allLoopSettings state changes
  useEffect(() => {
    localStorage.setItem("loops", JSON.stringify(allLoopSettings));
  }, [allLoopSettings]);

  // // If "tempSong" exists in local storage use that to init state
  // useEffect(() => {
  //   const data = localStorage.getItem("tempSong");
  //   if (data) {
  //     thereIsASongInStorage.current = true;
  //     const tempSong = JSON.parse(data);
  //     if (tempSong.title) setSongTitle(tempSong.title);
  //     if (
  //       typeof tempSong.loop === "object" &&
  //       typeof tempSong.loop.bars === "number"
  //     )
  //       setBars(tempSong.loop.bars);
  //     if (
  //       typeof tempSong.loop === "object" &&
  //       typeof tempSong.loop.beats === "number"
  //     )
  //       setBeatsPerBar(tempSong.loop.beats);
  //     if (
  //       typeof tempSong.loop === "object" &&
  //       typeof tempSong.loop.bpm === "number"
  //     )
  //       setBpm(tempSong.loop.bpm);
  //     if (tempSong.samples) setAllSampleData(tempSong.samples);
  //     console.log("✅ LocalStorage loaded to app", nowMilliseconds, tempSong);
  //     setHasLoadedFromStorage(true);
  //   }
  // }, []);

  // Start Tone.js context once
  useEffect(() => {
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
    };
    init();
  }, []);

  // Update ToneJS loopEnd when bars or beatsPerBar changes
  useEffect(() => {
    const loopEnd = `${bars}:0:0`;
    Tone.getTransport().loop = true;
    Tone.getTransport().loopStart = "0:0:0";
    Tone.getTransport().loopEnd = loopEnd;
  }, [bars, beatsPerBar]);

  // Schedule metronome playback based on time signature
  useEffect(() => {
    // beatsCount will increment to keep track of when down-beat or off-beat should play
    let beatCount = 0;

    const metronomeLoop = Tone.getTransport().scheduleRepeat((time) => {
      if (!loopIsPlaying || !metronomeActive) return;

      const [, beats] = (Tone.getTransport().position as string)
        .split(":")
        .map(Number);
      beatCount = beats % beatsPerBar;

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
  }, [loopIsPlaying, metronomeActive, beatsPerBar]);

  // Update ToneJS Transport bpm setting
  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  // Update Tone.js timeSignature when beatsPerBar changes;
  useEffect(() => {
    Tone.getTransport().timeSignature = beatsPerBar;
  }, [beatsPerBar]);

  // Update ToneJS Transport loop length
  useEffect(() => {
    Tone.getTransport().loop = true;
    Tone.getTransport().loopStart = "0:0:0";
    Tone.getTransport().loopEnd = `${bars}:0:0`;
  }, [bars]);

  // Load samplers to samplerRef
  useEffect(() => {
    loadSamplers("loc");
    loadSamplers("kit");
  }, []);

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

  // // Fetch samples when globalCollectionName changes
  // useEffect(() => {
  //   console.log(
  //     "useEffect for globalCollectionNameChange just ran",
  //     nowMilliseconds
  //   );
  //   // if (
  //   //   // thereIsASongInStorage &&
  //   //   localStorage.tempSong &&
  //   //   localStorage.tempSong.samples &&
  //   //   localStorage.tempSong.samples.includes("loc-1")
  //   // )
  //   //   return;
  //   if (!hasLoadedFromStorage || localStorage.tempSong) return;

  //   const fetchSamples = async () => {
  //     try {
  //       const selectedSamples = selectRandomUrlEntries(
  //         allUrlsWithCollectionNames
  //       );

  //       // Create data structutre for the selected samples
  //       const formattedSamples: SampleType[] = Array.from(
  //         selectedSamples,
  //         ({ url, collection }, index) => {
  //           const sampleId = `loc-${index + 1}`;

  //           return initLocSampleData(sampleId, url, collection);
  //         }
  //       );
  //       console.log("formatted Samples", formattedSamples);
  //       setLocSamples(formattedSamples);
  //     } catch (error) {
  //       console.error("Error fetching samples:", error);
  //       setLocSamples([]);
  //     }
  //   };

  //   // Clean up only the library of congress samplers
  //   if (samplersRef.current) {
  //     Object.entries(samplersRef.current).forEach(([key, sampler]) => {
  //       // Kit samples should not be impacted by a change in globalCollectionName
  //       if (sampler.id.includes("kit")) return;
  //       cleanupSampler(key, samplersRef);
  //     });
  //   }

  //   fetchSamples();
  // }, []);

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
        masterGainNode,
        setMasterGainLevel,
        metronomeActive,
        setMetronomeActive,
        metronome,
        currentLoop,
        setCurrentLoop,
        loopIsPlaying,
        setLoopIsPlaying,
        handleSelectLoop,
        allLoopSettings,
        setAllLoopSettings,
        isRecording,
        setIsRecording,
        makeSampler,
        initLocSampleData,
        updateSamplerData,
        globalCollectionName,
        setGlobalCollectionName,
        allSampleData,
        updateSamplerStateSettings,
        setAllSampleData,
        selectedSampleId,
        setSelectedSampleId,
        samplersRef,
        solosExist,
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
