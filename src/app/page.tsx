"use client";
import Image from "next/image";
import DrumMachine from "./components/DrumMachine";
import axios from "axios";
import { useEffect, useState } from "react";
import { SampleType } from "./types/SampleType";

const query: string = "jazz";
const baseUrl: string = `https://www.loc.gov/audio/?q=${query}&fa=partof:national+jukebox&fo=json`;

export default function Home() {
  const [samples, setSamples] = useState(null);

  useEffect(() => {
    const fetchMetaData = async () => {
      const response = await axios.get(baseUrl);
      const results = response.data.content.results;

      console.log("results:", results);

      const fetchedSamples = results.map((result) => {
        const sample: SampleType = { title: result.title }; // Start with required property

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
    fetchMetaData();
  }, []);

  return (
    <div className="flex justify-center items-center my-5">
      {samples && <DrumMachine samples={samples} />}
    </div>
  );
}
