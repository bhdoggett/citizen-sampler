"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
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
import { getCollectionArray, UrlEntry } from "../../lib/collections";
import { allUrlsWithCollectionNames } from "frontend/src/lib/sampleSources";
import { getTitle, getLabel } from "../functions/getTitle";
import metronome from "../metronome";
// import axios from "axios";
import { debounce, DebouncedFunc } from "lodash";

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:8000";

/////////////////
const now = new Date();
const nowMilliseconds =
  now.getHours() * 3600 +
  now.getMinutes() * 60 +
  now.getSeconds() +
  now.getMilliseconds() / 1000;
////////////////

type AudioContextType = {
  songTitle: string;
  setSongTitle: React.Dispatch<React.SetStateAction<string>>;
  masterGainNode: React.RefObject<Tone.Gain>;
  setMasterGainLevel: React.Dispatch<React.SetStateAction<number>>;
  metronomeActive: boolean;
  setMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  metronome: Tone.Sampler;
  bars: number;
  setBars: React.Dispatch<React.SetStateAction<number>>;
  beatsPerBar: number;
  setBeatsPerBar: React.Dispatch<React.SetStateAction<number>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  samplersRef: React.RefObject<Record<string, SamplerWithFX>>;
  locSamples: SampleType[];
  kitSamples: SampleType[];
  makeSampler: (
    sampleId: string,
    sampleUrl: string,
    offline: boolean
  ) => Promise<SamplerWithFX>;
  initializeLocSampleData: (
    id: string,
    url: string,
    collection: string
  ) => SampleType;
  updateSamplerData: (id: string, data: SampleType) => void;
  globalCollectionName: string;
  setGlobalCollectionName: React.Dispatch<React.SetStateAction<string>>;
  currentLoop: string;
  setCurrentLoop: React.Dispatch<React.SetStateAction<string>>;
  loopIsPlaying: boolean;
  setLoopIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  handleSelectLoop: (loop: LoopName) => void;
  allLoopSettings: React.RefObject<AllLoopSettings>;
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
  updateSamplerRefSettings: (id: string, key: string, value: number) => void;
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

  const thereIsASongInStorage = useRef<boolean>(false);
  const [songTitle, setSongTitle] = useState<string>("Song001");
  const [allSampleData, setAllSampleData] = useState<
    Record<string, SampleType>
  >({});
  const samplersRef = useRef<Record<string, SamplerWithFX>>({});

  const [locSamples, setLocSamples] = useState<SampleType[] | []>([]);
  const [kitSamples, setKitSamples] = useState<SampleType[] | []>([]);
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
  const allLoopSettings = useRef<AllLoopSettings>({
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
  const [hasLoadedFromStorage, setHasLoadedFromStorage] =
    useState<boolean>(false);

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

  useEffect(() => {
    if (!hasLoadedFromStorage || localStorage.tempSong) return;

    setKitSamples([
      {
        id: "kit-1",
        title: "Kick_Bulldog_2",
        collectionName: "Kit",
        label: "Kick",
        url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
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
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
        },
      },
      {
        id: "kit-2",
        title: "Snare_Astral_1",
        collectionName: "Kit",
        url: "/samples/drums/snares/Snare_Astral_1.wav",
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
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
        },
      },
      {
        id: "kit-3",
        title: "ClosedHH_Alessya_DS",
        collectionName: "Kit",
        url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
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
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
        },
      },
      {
        id: "kit-4",
        title: "Clap_Graphite",
        collectionName: "Kit",
        url: "/samples/drums/claps/Clap_Graphite.wav",
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
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
        },
      },
    ]);
  }, [hasLoadedFromStorage]);

  // test allSampleData state
  useEffect(() => {
    if (allSampleData) {
      console.log("allSampleData", nowMilliseconds, allSampleData);
    }
  }, [allSampleData]);

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

  // Format state data for a given loc sampler
  const initializeLocSampleData = (
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

  ///////////////////////////THIS IS WHAT I'M WORKING ON RIGHT NOW
  ///////////////////////////THIS IS WHAT I'M WORKING ON RIGHT NOW
  ///////////////////////////THIS IS WHAT I'M WORKING ON RIGHT NOW
  ///////////////////////////THIS IS WHAT I'M WORKING ON RIGHT NOW
  ///////////////////////////THIS IS WHAT I'M WORKING ON RIGHT NOW
  ///////////////////////////THIS IS WHAT I'M WORKING ON RIGHT NOW
  // Format object of selected loc Samples. this will be destructured to combine with initialized kit samples to create allSampleData state.

  // now i need a similar funciton for initializeing kit samples. these will then be combiend with below. Bypass the useState for locSamples and kitSamples. destructure the initialized objects for each group to create allSampleData. Then this can be the one source of truth for storing and fetching from local storage or from database calls.  Consider using the npm hook useLocalStorageState.
  const initializeLocSamples = () => {
    try {
      const selectedSamples = selectRandomUrlEntries(
        allUrlsWithCollectionNames
      );

      // Create data structutre for the selected samples
      const locSampleData = selectedSamples.map((sample) =>
        initializeLocSampleData(
          `loc-${sample.id}`,
          sample.url,
          sample.collection
        )
      );

      return locSampleData;
    } catch (error) {
      console.error("Error fetching samples:", error);
    }
  };

  // Update render state when different loops are selected
  const handleSelectLoop = (newLoop: LoopName) => {
    const settings = allLoopSettings.current;

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

  // Function for loading samplers from seperate locSamples and kitSamples arrays
  const loadSamplers = useCallback(async (samplesArray: SampleType[]) => {
    const samplers = await Promise.all(
      samplesArray.map(async ({ id, url }) => await makeSampler(id, url))
    );

    samplers.forEach((sampler, i) => {
      const id = samplesArray[i].id;
      samplersRef.current[id] = sampler;
    });
  }, []);

  // Load samples from local storage if present in the browser
  useEffect(() => {
    const loadFromStorage = async () => {
      const data = localStorage.getItem("tempSong");

      if (data) {
        thereIsASongInStorage.current = true;
        const tempSong = JSON.parse(data);

        if (tempSong.title) setSongTitle(tempSong.title);
        if (tempSong.loops) {
          allLoopSettings.current = tempSong.loops;
          setBars(tempSong.loops?.A?.bars || 2);
          setBeatsPerBar(tempSong.loops?.A?.beats || 4);
          setBpm(tempSong.loops?.A?.bpm || 120);
        }

        if (tempSong.samples) {
          setAllSampleData(tempSong.samples);
          const loc = Object.values(tempSong.samples).filter(
            (s) => s.collectionName !== "Kit"
          );
          const kit = Object.values(tempSong.samples).filter(
            (s) => s.collectionName === "Kit"
          );
          setLocSamples(loc);
          setKitSamples(kit);
        }
      }

      setHasLoadedFromStorage(true);
    };

    loadFromStorage();
  }, []);

  // // If "tempSong" exists in local storage use that to initialize state
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

  // Save necessary state to local storage when updated
  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const dataToStore = {
      title: songTitle,
      loops: allLoopSettings.current,
      samples: allSampleData,
    };
    localStorage.setItem("tempSong", JSON.stringify(dataToStore));
    console.log("✅ LocalStorage updated at", nowMilliseconds, dataToStore);
  }, [allSampleData, songTitle, nowMilliseconds, hasLoadedFromStorage]);

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

  // create samplers for library of congress samgples
  useEffect(() => {
    if (locSamples.length === 0) return;
    loadSamplers(locSamples);
  }, [locSamples, loadSamplers]);

  //create samplers for drum kit samples
  useEffect(() => {
    if (kitSamples.length === 0) return;
    loadSamplers(kitSamples);
  }, [kitSamples, loadSamplers]);

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

  // Fetch samples when globalCollectionName changes
  useEffect(() => {
    console.log(
      "useEffect for globalCollectionNameChange just ran",
      nowMilliseconds
    );
    // if (
    //   // thereIsASongInStorage &&
    //   localStorage.tempSong &&
    //   localStorage.tempSong.samples &&
    //   localStorage.tempSong.samples.includes("loc-1")
    // )
    //   return;
    if (!hasLoadedFromStorage || localStorage.tempSong) return;

    const fetchSamples = async () => {
      try {
        const selectedSamples = selectRandomUrlEntries(
          allUrlsWithCollectionNames
        );

        // Create data structutre for the selected samples
        const formattedSamples: SampleType[] = Array.from(
          selectedSamples,
          ({ url, collection }, index) => {
            const sampleId = `loc-${index + 1}`;

            return initializeLocSampleData(sampleId, url, collection);
          }
        );
        console.log("formatted Samples", formattedSamples);
        setLocSamples(formattedSamples);
      } catch (error) {
        console.error("Error fetching samples:", error);
        setLocSamples([]);
      }
    };

    // Clean up only the library of congress samplers
    if (samplersRef.current) {
      Object.entries(samplersRef.current).forEach(([key, sampler]) => {
        // Kit samples should not be impacted by a change in globalCollectionName
        if (sampler.id.includes("kit")) return;
        cleanupSampler(key, samplersRef);
      });
    }

    fetchSamples();
  }, []);

  // Update LOC samples only
  useEffect(() => {
    if (locSamples.length === 0) return; /// Do i need this???
    setAllSampleData((prev) => {
      const updated = { ...prev };
      locSamples.forEach((sample) => {
        updated[sample.id] = sample;
      });
      return updated;
    });
  }, [locSamples]);

  // Update Kit samples only when they actually change
  useEffect(() => {
    if (kitSamples.length === 0) return; /// Do I need this???
    setAllSampleData((prev) => {
      const updated = { ...prev };
      kitSamples.forEach((sample) => {
        updated[sample.id] = sample;
      });
      return updated;
    });
  }, [kitSamples]);

  // Update one sampler's data (entire) whenever anything inside that sampler's data changes
  const updateSamplerData = (id: string, data: SampleType): void => {
    setAllSampleData((prev) => ({
      ...prev,
      [id]: data,
    }));
    //
  };

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

  // WHERE DO I USE THIS???
  const updateSamplerRefSettings = (
    id: string,
    key: string,
    value: number
  ): void => {
    const samplerWithFX = samplersRef.current[id];
    if (samplerWithFX) {
      const { sampler, panVol, highpass, lowpass } = samplerWithFX;
      switch (key) {
        case "volume":
          panVol.volume.value = value;
          break;
        case "pan":
          panVol.pan.value = value;
          break;
        case "highpass":
          highpass.frequency.value = value;
          break;
        case "lowpass":
          lowpass.frequency.value = value;
          break;
        case "attack":
          sampler.attack = value;
          break;
        case "release":
          sampler.release = value;
          break;
        default:
          break;
      }
    }
  };

  // updates solosExist when a sampler's solo state changes
  useEffect(() => {
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
        bars,
        setBars,
        beatsPerBar,
        setBeatsPerBar,
        bpm,
        setBpm,
        currentLoop,
        setCurrentLoop,
        loopIsPlaying,
        setLoopIsPlaying,
        handleSelectLoop,
        allLoopSettings,
        isRecording,
        setIsRecording,
        locSamples,
        kitSamples,
        makeSampler,
        initializeLocSampleData,
        updateSamplerData,
        globalCollectionName,
        setGlobalCollectionName,
        allSampleData,
        updateSamplerStateSettings,
        updateSamplerRefSettings,
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
