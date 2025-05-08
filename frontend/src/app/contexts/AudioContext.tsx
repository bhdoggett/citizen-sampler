"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import * as Tone from "tone";
import {
  SampleType,
  SampleSettings,
  SamplerWithFX,
} from "../../types/SampleTypes";
import { getCollectionArray } from "../../lib/collections";
import { getTitle, getLabel } from "../functions/getTitle";
import metronome from "../metronome";

type AudioContextType = {
  masterGainNode: React.RefObject<Tone.Gain>;
  setMasterGainLevel: React.Dispatch<React.SetStateAction<number>>;
  metronomeActive: boolean;
  setMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  metronome: Tone.Sampler;
  loopLength: number;
  setLoopLength: React.Dispatch<React.SetStateAction<number>>;
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
  initializeSamplerData: (
    id: string,
    url: string,
    collection: string
  ) => SampleType;
  updateSamplerData: (id: string, data: SampleType) => void;
  globalCollectionName: string;
  setGlobalCollectionName: React.Dispatch<React.SetStateAction<string>>;
  loopIsPlaying: boolean;
  setLoopIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
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
  waveformIsPlaying: boolean;
  setWaveformIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
};

const AudioContextContext = createContext<AudioContextType | null>(null);

export const AudioProvider = ({ children }: React.PropsWithChildren) => {
  const [allSampleData, setAllSampleData] = useState<
    Record<string, SampleType>
  >({});
  const samplersRef = useRef<Record<string, SamplerWithFX>>({});

  const [locSamples, setLocSamples] = useState<SampleType[] | []>([]);
  const [kitSamples] = useState<SampleType[] | []>([
    {
      id: "kit-1",
      title: "Kick_Bulldog_2",
      collection: "Kit",
      label: "Kick",
      url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
      events: [],
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
      collection: "Kit",
      url: "/samples/drums/snares/Snare_Astral_1.wav",
      events: [],
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
      collection: "Kit",
      url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
      events: [],
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
      collection: "Kit",
      url: "/samples/drums/claps/Clap_Graphite.wav",
      events: [],
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
  const [globalCollectionName, setGlobalCollectionName] = useState<string>(
    "Inventing Entertainment"
  );
  const [loopIsPlaying, setLoopIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [loopLength, setLoopLength] = useState<number>(2);
  const [beatsPerBar, setBeatsPerBar] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(120);
  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const masterGainNode = useRef<Tone.Gain>(
    new Tone.Gain(masterGainLevel).toDestination()
  );
  const [selectedSampleId, setSelectedSampleId] = useState<string>("loc-1");
  const [solosExist, setSolosExist] = useState<boolean>(false);
  const [waveformIsPlaying, setWaveformIsPlaying] = useState<boolean>(false);

  // Function to create a sampler with FX chain.
  // If using with Tone.Offline to download WAV stems, the third argument should be "true".
  const makeSampler = async (
    sampleId: string,
    sampleUrl: string,
    offline: boolean = false
  ): Promise<SamplerWithFX> => {
    return new Promise((resolve, reject) => {
      const gain = new Tone.Gain(1); // Strictly for the purpose of controlling muting or soloing tracks
      const env = new Tone.Envelope({
        attack: 0,
        release: 0,
      });
      const pitch = new Tone.PitchShift(0);
      const panVol = new Tone.PanVol(0, 0);
      const highpass = new Tone.Filter(0, "highpass");
      const lowpass = new Tone.Filter(20000, "lowpass");
      const sampler = new Tone.Sampler({
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
            env,
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

  //testing things
  useEffect(() => {
    console.log("all collected samples:", allSampleData);
    // console.log("globalCollectionName", globalCollectionName);
  }, [allSampleData, globalCollectionName]);

  // Start Tone.js context once
  useEffect(() => {
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
    };
    init();
  }, []);

  // Update ToneJS loopEnd when loopLength or beatsPerBar changes
  useEffect(() => {
    const loopEnd = `${loopLength}:0:0`;
    Tone.getTransport().loop = true;
    Tone.getTransport().loopStart = "0:0:0";
    Tone.getTransport().loopEnd = loopEnd;
  }, [loopLength, beatsPerBar]);

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
    Tone.getTransport().loopEnd = `${loopLength}:0:0`;
  }, [loopLength]);

  // create samplers for library of congress samples
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

  const initializeSamplerData = (
    id: string,
    url: string,
    collection: string
  ): SampleType => {
    return {
      id: id,
      title: getTitle(url),
      collection: collection,
      label: getLabel(url),
      url: url,
      events: [],
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
  // fetch samples using the globalCollectionName
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const collectionArray = getCollectionArray(globalCollectionName);
        if (!collectionArray) return;

        // Select 8 samples from the colletion randomly
        const selectedSamples = Array.from({ length: 8 }, () => {
          const index = Math.floor(Math.random() * collectionArray.length);
          return collectionArray[index];
        });

        // Create data structutre for the selected samples
        const formattedSamples: SampleType[] = Array.from(
          selectedSamples,
          (url, index) => {
            const sampleId = `loc-${index + 1}`;

            return initializeSamplerData(sampleId, url, globalCollectionName);
          }
        );
        setLocSamples(formattedSamples);
      } catch (error) {
        console.error("Error fetching samples:", error);
        setLocSamples([]);
      }
    };

    // Clean up only the library of congress samplers
    if (samplersRef.current) {
      Object.entries(samplersRef.current).forEach(([key, sampler]) => {
        // omit kit samples from a change in sample collection
        if (sampler.id.includes("kit")) return;
        cleanupSampler(key, samplersRef);
      });
    }

    fetchSamples();
  }, [globalCollectionName]);

  // initialize allSampleData state with the locSamples and kitSamples
  ///  I NEED TO UPDATE THIS SO THAT ONLY THE LOC SAMPLER DATA GETS SWAPPED WHEN THOSE CHANGE. DON'T WANT TO REINITIALIZE THE KIT SAMPLES
  useEffect(() => {
    setAllSampleData(() => {
      const sampleDataObj: Record<string, SampleType> = {};
      [...locSamples, ...kitSamples].forEach((sample) => {
        sampleDataObj[sample.id] = sample;
      });
      return sampleDataObj;
    });
  }, [locSamples, kitSamples]);

  // WHERE DO I USE THIS???

  // funciton to update one sampler's data (entire) whenever anythign inside that sampler's data changes
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

  return (
    <AudioContextContext.Provider
      value={{
        masterGainNode,
        setMasterGainLevel,
        metronomeActive,
        setMetronomeActive,
        metronome,
        loopLength,
        setLoopLength,
        beatsPerBar,
        setBeatsPerBar,
        bpm,
        setBpm,
        loopIsPlaying,
        setLoopIsPlaying,
        isRecording,
        setIsRecording,
        locSamples,
        kitSamples,
        makeSampler,
        initializeSamplerData,
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
        waveformIsPlaying,
        setWaveformIsPlaying,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

// export const useAudioContext = () => useContext(AudioContextContext);

export const useAudioContext = () => {
  const context = useContext(AudioContextContext);
  if (!context) {
    throw new Error(
      "useAudioContext must be used within an AudioContextProvider"
    );
  }
  return context;
};
