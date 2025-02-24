"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { SampleType } from "../types/SampleType";
import type { SampleData } from "../types/SampleData";
import { TransportClass } from "tone/build/esm/core/clock/Transport";

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
      audioUrl: "/samples/drums/kicks/Kick_Bulldog_2.wav",
      id: "drum-1",
    },
    {
      title: "Snare_Astral_1",
      label: "Snare",
      type: "drumKit",
      audioUrl: "/samples/drums/snares/Snare_Astral_1.wav",
      id: "drum-2",
    },
    {
      title: "ClosedHH_Alessya_DS",
      type: "drumKit",
      label: "HiHat",
      audioUrl: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
      id: "drum-3",
    },
    {
      title: "Clap_Graphite",
      type: "drumKit",
      label: "Clap",
      audioUrl: "/samples/drums/claps/Clap_Graphite.wav",
      id: "drum-4",
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
        console.log(result);
        const allSamples: SampleType[] = Array.from(
          result[genre],
          (sample, index) => ({
            id: `loc-${index + 1}`,
            type: `loc-${genre}`,
            title: sample,
            audioUrl: `/samples/national-jukebox/${genre}/excerpts/${sample}`,
            pitch: 0, // semitones that the sample has been pitch-shifted
            finetune: 0,
            times: [],
            settings: {
              main: { gain: 1, pan: 0 },
              envelopes: {
                amplitude: {
                  attack: 0,
                  decay: 0,
                  sustain: 0,
                  release: 0,
                },
                pitch: {
                  attack: 0,
                  decay: 0,
                  sustain: 0,
                  release: 0,
                },
              },
              fx: {
                eq3: {
                  active: false,
                  settings: [0, 0, 0],
                  reverb: 0,
                  distortion: 0,
                  delay: { division: "8n.", amount: 0 },
                  bitcrusher: 0,
                },
                attribution: "",
              },
            },
          })
        );

        console.log(allSamples);

        const sampleSet = allSamples.slice(0, 16);
        console.log("sampleSet:", sampleSet);
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
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
