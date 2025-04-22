"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import {
  SampleType,
  SampleSettings,
  QuantizeValue,
  SamplerWithFX,
} from "../types/SampleTypes";
import { TransportClass } from "tone/build/esm/core/clock/Transport";
import { getCollectionArray } from "@/lib/collections";
import { getTitle, getLabel } from "../functions/getTitle";
import metronome from "../metronome";

type AudioContextType = {
  masterGainNode: React.RefObject<Tone.Gain>;
  setMasterGainLevel: React.Dispatch<React.SetStateAction<number>>;
  transport: React.RefObject<TransportClass>;
  audioContext: Tone.Context | null;
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
  collectionName: string;
  setCollectionName: React.Dispatch<React.SetStateAction<string>>;
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
  selectedSampleId: string | null;
  setSelectedSampleId: React.Dispatch<React.SetStateAction<string | null>>;
  solosExist: boolean;
};

const AudioContextContext = createContext<AudioContextType | null>(null);

export const AudioProvider = ({ children }: React.PropsWithChildren) => {
  const [audioContext, setAudioContext] = useState<Tone.Context | null>(null);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [loopLength, setLoopLength] = useState<number>(2);
  const [beatsPerBar, setBeatsPerBar] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(120);
  const [locSamples, setLocSamples] = useState<SampleType[] | []>([]);
  const [kitSamples] = useState<SampleType[] | []>([
    {
      id: "kit-1",
      type: "drumKit",
      title: "Kick_Bulldog_2",
      pad: 9,
      label: "Kick",
      url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
      events: [],
      settings: {
        mute: false,
        solo: false,
        volume: 0,
        pan: 0,
        pitch: 0,
        finetune: 0,
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
      type: "drumKit",
      title: "Snare_Astral_1",
      pad: 10,
      label: "Snare",
      url: "/samples/drums/snares/Snare_Astral_1.wav",
      events: [],
      settings: {
        mute: false,
        solo: false,
        volume: 0,
        pan: 0,
        pitch: 0,
        finetune: 0,
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
      type: "drumKit",
      title: "ClosedHH_Alessya_DS",
      label: "HiHat",
      pad: 11,
      url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
      events: [],
      settings: {
        mute: false,
        solo: false,
        volume: 0,
        pan: 0,
        pitch: 0,
        finetune: 0,
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
      type: "drumKit",
      title: "Clap_Graphite",
      label: "Clap",
      pad: 12,
      url: "/samples/drums/claps/Clap_Graphite.wav",
      events: [],
      settings: {
        mute: false,
        solo: false,
        volume: 0,
        pan: 0,
        pitch: 0,
        finetune: 0,
        attack: 0,
        release: 0,
        quantize: false,
        quantVal: 4,
        highpass: [0, "highpass"],
        lowpass: [20000, "lowpass"],
      },
    },
  ]);
  const [collectionName, setCollectionName] = useState<string>(
    "Inventing Entertainment"
  );
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [loopIsPlaying, setLoopIsPlaying] = useState(false);
  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const masterGainNode = useRef<Tone.Gain>(
    new Tone.Gain(masterGainLevel).toDestination()
  );
  const [allSampleData, setAllSampleData] = useState<
    Record<string, SampleType>
  >({});
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [solosExist, setSolosExist] = useState<boolean>(false);
  const transport = useRef<TransportClass>(Tone.getTransport());
  // New ref to store all samplers and their FX chains
  const samplersRef = useRef<Record<string, SamplerWithFX>>({});
  // Function to create a sampler with FX chain
  const makeSampler = (sampleId: string, sampleUrl: string): SamplerWithFX => {
    const sampler = new Tone.Sampler({
      urls: { C4: sampleUrl },
    });

    const gain = new Tone.Gain(1); // Strictly for the purpose of controlling muting or soloing tracks
    const panVol = new Tone.PanVol(0, 0);
    const highpass = new Tone.Filter(0, "highpass");
    const lowpass = new Tone.Filter(20000, "lowpass");

    // Connect the FX chain
    sampler.connect(gain);
    gain.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(panVol);
    panVol.connect(masterGainNode.current).toDestination();

    return {
      id: sampleId,
      sampler,
      gain,
      panVol,
      highpass,
      lowpass,
      currentEvent: { startTime: null, duration: null },
    };
  };

  // //testing things
  // useEffect(() => {
  //   console.log("all collected samples:", allSampleData);
  //   console.log("collectionName", collectionName);
  // }, [allSampleData, collectionName]);

  // Start Tone.js context once
  useEffect(() => {
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
      setAudioContext(Tone.getContext());
    };
    init();
  }, []);

  // Update ToneJS loopEnd when loopLength or beatsPerBar changes
  useEffect(() => {
    const loopEnd = `${loopLength}:0:0`;
    transport.current.loop = true;
    transport.current.loopStart = "0:0:0";
    transport.current.loopEnd = loopEnd;
  }, [loopLength, transport, beatsPerBar]);
  ///////////

  // Schedule metronome playback based on time signature
  useEffect(() => {
    // beatsCount will increment to keep track of when down-beat or off-beat should play
    let beatCount = 0;

    const metronomeLoop = transport.current.scheduleRepeat((time) => {
      if (!loopIsPlaying || !metronomeActive) return;

      const [, beats] = transport.current.position.split(":").map(Number);
      beatCount = beats % beatsPerBar;

      if (beatCount === 0) {
        metronome.triggerAttackRelease("C6", "8n", time);
      } else {
        metronome.triggerAttackRelease("G5", "8n", time);
      }
    }, "4n");

    const transportForCleanup = transport.current;

    return () => {
      transportForCleanup.clear(metronomeLoop);
    };
  }, [loopIsPlaying, metronomeActive, beatsPerBar, transport]);

  // Update ToneJS Transport bpm setting
  useEffect(() => {
    transport.current.bpm.value = bpm;
  }, [bpm, transport]);

  // Update Tone.js timeSignature when beatsPerBar changes;
  useEffect(() => {
    transport.current.timeSignature = beatsPerBar;
  }, [transport, beatsPerBar]);

  // Update ToneJS Transport loop length
  useEffect(() => {
    transport.current.loop = true;
    transport.current.loopStart = "0:0:0";
    transport.current.loopEnd = `${loopLength}:0:0`;
  }, [loopLength, transport]);

  //create samplers for library of congress samples
  useEffect(() => {
    if (locSamples.length > 0) {
      locSamples.forEach(({ id, url }) => {
        // const name = id.split("_")[0];
        samplersRef.current[id] = makeSampler(id, url);
      });
    }
  }, [locSamples]);

  //create samplers for drum kit samples
  useEffect(() => {
    if (kitSamples.length > 0) {
      kitSamples.forEach(({ id, url }) => {
        samplersRef.current[id] = makeSampler(id, url);
      });
    }
  }, [kitSamples]);

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

  // fetch samples using the collectionName
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const collectionArray = getCollectionArray(collectionName);
        if (!collectionArray) return;

        // Select 8 samples from the colletion randomly
        const selectedSamples = Array.from({ length: 8 }, () => {
          const index = Math.floor(Math.random() * collectionArray.length);
          return collectionArray[index];
        });

        // Create data structutre for the selected samples
        const formattedSamples: SampleType[] = Array.from(
          selectedSamples,
          (sample, index) => {
            const sampleData = {
              id: `loc-${index + 1}`,
              type: `loc-${collectionName.replace(" ", "-")}`,
              title: getTitle(sample),
              label: getLabel(sample),
              pad: index + 1,
              url: sample,
              events: [],
              settings: {
                mute: false,
                solo: false,
                volume: 0,
                pan: 0,
                pitch: 0,
                finetune: 0,
                attack: 0,
                release: 0,
                quantize: false,
                quantVal: 4 as QuantizeValue,
                highpass: [0, "highpass"] as [number, "highpass"],
                lowpass: [20000, "lowpass"] as [number, "lowpass"],
              },
              attribution: "",
            };
            return sampleData;
          }
        );
        setLocSamples(formattedSamples);
      } catch (error) {
        console.error("Error fetching samples:", error);
        // Set empty array on error to prevent null/undefined issues
        setLocSamples([]);
      }
    };

    fetchSamples();
  }, [collectionName]);

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

  // Universal cleanup function for samplers
  const cleanupSampler = (
    sampleId: string,
    ref: React.RefObject<SamplerWithFX>
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

  // WHERE DO I USE THIS???
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

  // updates solosExist when samplers' solo state changes
  useEffect(() => {
    const solosExistNow = Object.values(allSampleData).some(
      (sample) => sample.settings.solo
    );
    setSolosExist(solosExistNow);
    console.log("solosExist", solosExist);
  }, [allSampleData, solosExist]);

  // Sampler audio output based on mutes and solos:
  useEffect(() => {
    // const solosExist = Object.values(allSampleData).some(
    //   (sample) => sample.settings.solo
    // );

    if (solosExist) {
      Object.keys(allSampleData).forEach((id) => {
        samplersRef.current[id].gain.gain.value = allSampleData[id].settings
          .mute
          ? 0
          : allSampleData[id].settings.solo
            ? 1
            : 0;
      });
    }

    if (!solosExist) {
      Object.keys(allSampleData).forEach((id) => {
        samplersRef.current[id].gain.gain.value = allSampleData[id].settings
          .mute
          ? 0
          : 1;
      });
    }

    console.log("allsampleData", allSampleData);
  }, [allSampleData, solosExist]);

  return (
    <AudioContextContext.Provider
      value={{
        masterGainNode,
        setMasterGainLevel,
        transport,
        audioContext,
        metronomeActive,
        setMetronomeActive,
        metronome,
        loopLength,
        setLoopLength,
        beatsPerBar,
        setBeatsPerBar,
        bpm,
        setBpm,
        locSamples,
        kitSamples,
        collectionName,
        setCollectionName,
        loopIsPlaying,
        setLoopIsPlaying,
        isRecording,
        setIsRecording,
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

export const useAudioContext = () => useContext(AudioContextContext);
