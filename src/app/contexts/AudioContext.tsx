"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { SampleType } from "../types/SampleType";
import type { SampleData } from "../types/SampleData";
import { TransportClass } from "tone/build/esm/core/clock/Transport";
import { FilterType } from "../types/SampleData";

const AudioContextContext = createContext(null);

type Genre = "classical" | "folk-songs" | "jazz" | "popular";

export const AudioProvider = ({ children }) => {
  const [audioContext, setAudioContext] = useState(Tone.getContext());
  // const [query, setQuery] = useState<string>("jazz");
  const [njbSamples, setNjbSamples] = useState(null);
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
        main: { gain: 1, pan: 0 },
        adsr: {
          attack: 0,
          decay: 0,
          sustain: 0,
          release: 0,
        },
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
        main: { gain: 1, pan: 0 },
        adsr: {
          attack: 0,
          decay: 0,
          sustain: 0,
          release: 0,
        },
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
        main: { gain: 1, pan: 0 },
        adsr: {
          attack: 0,
          decay: 0,
          sustain: 0,
          release: 0,
        },
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
        main: { gain: 1, pan: 0 },
        adsr: {
          attack: 0,
          decay: 0,
          sustain: 0,
          release: 0,
        },
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
  const transport = useRef<TransportClass | null>(null);

  // Start Tone.js context once and get transport
  useEffect(() => {
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
      setAudioContext(Tone.getContext());
    };
    init();

    transport.current = Tone.getTransport();
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
            url: `/samples/national-jukebox/${genre}/excerpts/${sample}`,
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
        setNjbSamples(sampleSet);
      } catch (error) {
        console.error("Error fetching samples:", error);
      }
    };

    fetchSamples();
  }, [genre]); // Dependency array ensures re-fetching when `genre` changes

  return (
    <AudioContextContext.Provider
      value={{
        transport,
        audioContext,
        masterGainNode,
        njbSamples,
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
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
