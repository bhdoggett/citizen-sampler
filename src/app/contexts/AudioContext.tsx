"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { SampleType } from "../types/SampleType";

const AudioContextContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [audioContext, setAudioContext] = useState(null);
  const [query, setQuery] = useState<string>("popular+music");
  const [njbSamples, setNjbSamples] = useState(null);

  const url: string = `https://www.loc.gov/audio/?q=${query}&fa=partof:national+jukebox&fo=json`;

  useEffect(() => {
    let context: AudioContext | null = null;

    const initializeAudioContext = () => {
      if (audioContext) {
        console.log("Closing previous AudioContext...");
        audioContext.close(); // Close previous context
      }

      context = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(context);
    };

    initializeAudioContext();

    const fetchSamples = async () => {
      const response = await axios.get(url);
      const results = response.data.content.results;

      console.log("results:", results);

      const fetchedSamples = results.slice(0, 16).map((result) => {
        const sample: SampleType = { title: result.title, type: "nbjSample" };

        if (result.resources?.[0]?.media)
          sample.audioUrl = result.resources[0].media;
        if (result.image_url) sample.imageUrl = result.image_url;
        if (result.contributor) sample.contributor = result.contributor;
        if (result.contributor_composer)
          sample.composer = result.contributor_composer;
        if (result.contributor_musical_group)
          sample.group = result.contributor_musical_group;
        if (result.contributor_primary)
          sample.primary = result.contributor_primary;

        return sample;
      });

      setNjbSamples(fetchedSamples);
    };

    fetchSamples();

    return () => context.close();
  }, [query]);

  // useEffect(() => fetchSamples(), []);

  return (
    <AudioContextContext.Provider
      value={{ audioContext, njbSamples, setQuery }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
