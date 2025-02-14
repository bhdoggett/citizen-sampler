"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import * as Tone from "tone";
import { SampleType } from "../types/SampleType";

const AudioContextContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [audioContext, setAudioContext] = useState(Tone.getContext());
  const [query, setQuery] = useState<string>("jazz");
  const [njbSamples, setNjbSamples] = useState(null);
  const [genre, setGenre] = useState<string>("jazz");

  const url: string = `https://www.loc.gov/audio/?q=${query}&fa=partof:national+jukebox&fo=json`;

  const masterGain = new Tone.Gain(1).toDestination(); // Adjust volume here

  const genreUrl = `/samples/national-jukebox/${genre}/exerpts`;

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
    // let context: AudioContext | null = null;

    // const initializeAudioContext = () => {
    //   if (audioContext) {
    //     console.log("Closing previous AudioContext...");
    //     audioContext.close(); // Close previous context
    //   }

    //   context = new (window.AudioContext || window.webkitAudioContext)();
    //   setAudioContext(context);
    // };

    // initializeAudioContext();

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

    // return () => context.close();
  }, [query]);

  const playSample = async (audioUrl, gainNode) => {
    if (!audioUrl) {
      console.error("No audio URL provided");
      return;
    }

    await Tone.start(); // Ensure Tone.js context is started

    console.log("Playing sample:", audioUrl);

    try {
      const newPlayer = new Tone.Player({
        url: audioUrl,
        onload: () => {
          console.log("Sample loaded:", audioUrl);
          newPlayer.connect(gainNode);
          newPlayer.start();
        },
        onerror: (err) => console.error("Error loading sample:", err),
      }).toDestination();

      return newPlayer;
    } catch (error) {
      console.error("Failed to play sample:", error);
    }
  };

  return (
    <AudioContextContext.Provider
      value={{
        audioContext,
        playSample,
        njbSamples,
        setQuery,
        setGenre,
        masterGain,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
