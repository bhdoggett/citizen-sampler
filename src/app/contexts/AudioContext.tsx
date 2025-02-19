"use client";
import { createContext, useContext, useEffect, useState } from "react";
import * as Tone from "tone";
import { SampleType } from "../types/SampleType";
import type { SampleData } from "../types/SampleData";

const AudioContextContext = createContext(null);

type Genre = "classical" | "folk-songs" | "jazz" | "popular";

export const AudioProvider = ({ children }) => {
  const [audioContext, setAudioContext] = useState(Tone.getContext());
  // const [query, setQuery] = useState<string>("jazz");
  const [njbSamples, setNjbSamples] = useState(null);
  const [genre, setGenre] = useState<Genre | null>("jazz");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quantizeRecordActive, setQuantizeRecordActive] =
    useState<boolean>(false);
  const [quantizeSetting, setQuantizeSetting] = useState<number>(4);
  const [masterGainLevel, setMasterGainLevel] = useState<number>(1);
  const [allSampleData, setAllSampleData] = useState<SampleData[]>([]);
  const transport = Tone.getTransport();
  const masterGain = new Tone.Gain(masterGainLevel).toDestination(); // Adjust volume here

  //
  const kit: SampleType[] = [
    {
      title: "Kick_Cobalt_2",
      label: "Kick",
      type: "drumKit",
      audioUrl: "/samples/drums/kicks/Kick_Cobalt_2.wav",
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
      title: "Perc_Spicy_7",
      type: "drumKit",
      label: "Perc",
      audioUrl: "/samples/drums/perc/Perc_Spicy_7.wav",
      id: "drum-4",
    },
  ];
  // useEffect(() => {
  //   Tone.start();
  // }, []);

  useEffect(() => {
    // Ensure the Tone.js context is started once
    const init = async () => {
      await Tone.start();
      console.log("Tone.js started");
      setAudioContext(Tone.getContext());
    };
    init();
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
            type: `njb-${genre}`,
            audioUrl: `/samples/national-jukebox/${genre}/excerpts/${sample}`,
            id: `njb-${index + 1}`,
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

  const updateSampleData = (newSampleData: SampleData) => {
    setAllSampleData((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === newSampleData.id
      );
      if (existingIndex !== -1) {
        const updatedData = [...prev];
        updatedData[existingIndex] = newSampleData;
        return updatedData;
      } else {
        return [...prev, newSampleData];
      }
    });
  };

  return (
    <AudioContextContext.Provider
      value={{
        transport,
        audioContext,
        njbSamples,
        kit,
        setGenre,
        masterGain,
        isPlaying,
        setIsPlaying,
        isRecording,
        setIsRecording,
        quantizeRecordActive,
        setQuantizeRecordActive,
        quantizeSetting,
        setQuantizeSetting,
        allSampleData,
        setAllSampleData,
        updateSampleData,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
