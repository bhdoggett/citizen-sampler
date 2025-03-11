"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { SampleType } from "../types/SampleType";
import type { SampleData } from "../types/SampleData";
import { TransportClass } from "tone/build/esm/core/clock/Transport";
import { FilterType } from "../types/SampleData";

const AudioContextContext = createContext(null);

type Genre = "classical" | "folk-songs" | "jazz" | "popular";

interface SamplerWithFX {
  sampler: Tone.Sampler;
  gain: Tone.Gain;
  highpass: Tone.Filter;
  lowpass: Tone.Filter;
}

export const AudioProvider = ({ children }) => {
  const [audioContext, setAudioContext] = useState(Tone.getContext());
  // const [query, setQuery] = useState<string>("jazz");
  const [locSamples, setLocSamples] = useState(null);
  const [kitSamples, setKitSamples] = useState([
    {
      title: "Kick_Bulldog_2",
      label: "Kick",
      type: "drumKit",
      url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
      id: "drum-1",
      pitch: 0, // semitones that the sample has been pitch-shifted
      finetune: 0,
      times: [],
      settings: {
        gain: 1,
        pan: 0,
        attack: 0,
        release: 0,
        fx: {
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
          eq3: [0, 0, 0],
          reverb: 0,
          distortion: 0,
          delay: { division: "8n.", value: 0 },
          bitcrusher: 0,
        },
      },
    },
    {
      title: "Snare_Astral_1",
      label: "Snare",
      type: "drumKit",
      url: "/samples/drums/snares/Snare_Astral_1.wav",
      id: "drum-2",
      pitch: 0, // semitones that the sample has been pitch-shifted
      finetune: 0,
      times: [],
      settings: {
        gain: 1,
        pan: 0,
        attack: 0,
        release: 0,
        fx: {
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
          eq3: [0, 0, 0],
          reverb: 0,
          distortion: 0,
          delay: { division: "8n.", value: 0 },
          bitcrusher: 0,
        },
      },
    },
    {
      title: "ClosedHH_Alessya_DS",
      type: "drumKit",
      label: "HiHat",
      url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
      id: "drum-3",
      pitch: 0, // semitones that the sample has been pitch-shifted
      finetune: 0,
      times: [],
      settings: {
        gain: 1,
        pan: 0,
        attack: 0,
        release: 0,
        fx: {
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
          eq3: [0, 0, 0],
          reverb: 0,
          distortion: 0,
          delay: { division: "8n.", value: 0 },
          bitcrusher: 0,
        },
      },
    },
    {
      title: "Clap_Graphite",
      type: "drumKit",
      label: "Clap",
      url: "/samples/drums/claps/Clap_Graphite.wav",
      id: "drum-4",
      pitch: 0, // semitones that the sample has been pitch-shifted
      finetune: 0,
      times: [],
      settings: {
        gain: 1,
        pan: 0,
        attack: 0,
        release: 0,
        fx: {
          highpass: [0, "highpass"],
          lowpass: [20000, "lowpass"],
          eq3: [0, 0, 0],
          reverb: 0,
          distortion: 0,
          delay: { division: "8n.", value: 0 },
          bitcrusher: 0,
        },
      },
    },
  ]);
  const [genre, setGenre] = useState<Genre | null>("jazz");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quantizeActive, setQuantizeActive] = useState<boolean>(false);
  const [quantizeValue, setQuantizeValue] = useState<number>(4);
  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const masterGainNode = useRef<Tone.Gain>(
    new Tone.Gain(masterGainLevel).toDestination()
  );
  const [allSampleData, setAllSampleData] = useState<SampleData[]>([]);
  // const [transport, setTransport] = useState<TransportClass | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleData | null>(null);
  const transport = useRef<TransportClass>(Tone.getTransport());

  // New ref to store all samplers and their FX chains
  const samplersRef = useRef<Record<string, SamplerWithFX>>({});

  // Function to create or get a sampler for a sample
  const getSampler = (sampleId: string, sampleUrl: string, settings: any) => {
    if (!samplersRef.current[sampleId]) {
      // Create new sampler and FX chain
      const sampler = new Tone.Sampler({
        urls: { C4: sampleUrl },
        attack: settings.attack,
        release: settings.release,
      });

      const gain = new Tone.Gain(settings.gain);
      const highpass = new Tone.Filter(settings.fx.highpass[0], "highpass");
      const lowpass = new Tone.Filter(settings.fx.lowpass[0], "lowpass");

      // Connect the FX chain
      sampler.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(masterGainNode.current);

      samplersRef.current[sampleId] = {
        sampler,
        gain,
        highpass,
        lowpass,
      };
    }

    return samplersRef.current[sampleId];
  };

  // Function to update sampler settings
  const updateSamplerSettings = (sampleId: string, settings: any) => {
    const samplerWithFX = samplersRef.current[sampleId];
    if (samplerWithFX) {
      const { sampler, gain, highpass, lowpass } = samplerWithFX;
      gain.gain.value = settings.gain;
      highpass.frequency.value = settings.fx.highpass[0];
      lowpass.frequency.value = settings.fx.lowpass[0];
      sampler.attack = settings.attack;
      sampler.release = settings.release;
    }
  };

  // Cleanup function for samplers
  const cleanupSampler = (sampleId: string) => {
    const samplerWithFX = samplersRef.current[sampleId];
    if (samplerWithFX) {
      const { sampler, gain, highpass, lowpass } = samplerWithFX;
      sampler.dispose();
      gain.dispose();
      highpass.dispose();
      lowpass.dispose();
      delete samplersRef.current[sampleId];
    }
  };

  // Start Tone.js context once and get transport
  useEffect(() => {
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
      setAudioContext(Tone.getContext());
    };
    init();
  }, []);

  // Cleanup effect for samplers when component unmounts
  useEffect(() => {
    return () => {
      Object.keys(samplersRef.current).forEach(cleanupSampler);
    };
  }, []);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await fetch("/fileList.json");
        const result = await response.json();
        const allSamples: SampleType[] = Array.from(
          result[genre],
          (sample, index) => ({
            id: `loc-${index + 1}`,
            type: `loc-${genre}`,
            title: sample,
            url: `/samples/loc/${genre}/excerpts/${sample}`,
            pitch: 0, // semitones that the sample has been pitch-shifted
            finetune: 0,
            times: [],
            settings: {
              gain: 1,
              attack: 0.1,
              release: 0.1,
              highpass: [0, "highpass"],
              lowpass: [20000, "lowpass"],
            },
            attribution: "",
          })
        );

        const sampleSet = allSamples.slice(0, 8);
        setLocSamples(sampleSet);
      } catch (error) {
        console.error("Error fetching samples:", error);
      }
    };

    fetchSamples();
  }, [genre]); // Dependency array ensures re-fetching when `genre` changes

  return (
    <AudioContextContext.Provider
      value={{
        setMasterGainLevel,
        transport,
        audioContext,
        masterGainNode,
        locSamples,
        kitSamples,
        setGenre,
        isPlaying,
        setIsPlaying,
        isRecording,
        setIsRecording,
        quantizeActive,
        setQuantizeActive,
        quantizeValue,
        setQuantizeValue,
        allSampleData,
        setAllSampleData,
        selectedSample,
        setSelectedSample,
        getSampler,
        updateSamplerSettings,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
