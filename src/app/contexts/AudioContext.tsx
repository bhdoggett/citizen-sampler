"use client";
import { createContext, useContext, useEffect, useState } from "react";
import * as Tone from "tone";
import { SampleType } from "../types/SampleType";

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
  const transport = Tone.getTransport();
  const masterGain = new Tone.Gain(masterGainLevel).toDestination(); // Adjust volume here

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

  return (
    <AudioContextContext.Provider
      value={{
        transport,
        audioContext,
        njbSamples,
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
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
