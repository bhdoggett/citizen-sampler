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

  // const url: string = `https://www.loc.gov/audio/?q=${query}&fa=partof:national+jukebox&fo=json`;

  const masterGain = new Tone.Gain(1).toDestination(); // Adjust volume here

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
        const allSamples = Array.from(result[genre], (sample) => ({
          type: njbSamples,
          audioUrl: `/samples/national-jukebox/${genre}/excerpts/${sample}`,
        }));
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
        audioContext,
        njbSamples,
        setGenre,
        masterGain,
        isRecording,
        setIsRecording,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
