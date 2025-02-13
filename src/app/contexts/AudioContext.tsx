"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { SampleType } from "../types/SampleType";

const AudioContextContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [audioContext, setAudioContext] = useState(null);
  const [query, setQuery] = useState<string>("jazz");
  const [samples, setSamples] = useState(null);

  const baseUrl: string = `https://www.loc.gov/audio/?q=${query}&fa=partof:national+jukebox&fo=json`;

  useEffect(() => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);

    const fetchSamples = async () => {
      const response = await axios.get(baseUrl);
      const results = response.data.content.results;

      console.log("results:", results);

      const fetchedSamples = results.slice(0, 16).map((result) => {
        const sample: SampleType = { title: result.title };

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

      setSamples(fetchedSamples);
    };

    fetchSamples();

    return () => context.close();
  }, [baseUrl]);

  // useEffect(() => fetchSamples(), []);

  return (
    <AudioContextContext.Provider value={{ audioContext, samples }}>
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
