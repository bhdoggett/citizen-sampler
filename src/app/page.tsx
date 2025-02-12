"use client";
import Image from "next/image";
import DrumMachine from "./components/DrumMachine";
import axios from "axios";
import { useEffect, useState } from "react";
import { SampleType } from "./types/SampleType";
import { useAudioContext } from "./contexts/AudioContext";

export default function Home() {
  const { audioContext, fetchSamples, samples } = useAudioContext();

  return (
    <div className="flex justify-center items-center my-5">
      {samples && <DrumMachine samples={samples} />}
    </div>
  );
}

// useEffect(() => {
//   const fetchSamples = async () => {
//     const response = await axios.get(baseUrl);
//     const results = response.data.content.results;

//     console.log("results:", results);

//     const fetchedSamples = results.map((result, index) => {
//       if (index < 8) {
//         const sample: SampleType = { title: result.title };

//         if (result.resources?.[0]?.media)
//           sample.audioUrl = result.resources[0].media;
//         if (result.image_url) sample.imageUrl = result.image_url;
//         if (result.contributor) sample.contributor = result.contributor;
//         if (result.contributor_composer)
//           sample.composer = result.contributor_composer;
//         if (result.contributor_musical_group)
//           sample.group = result.contributor_musical_group;
//         if (result.contributor_primary)
//           sample.primary = result.contributor_primary;

//         return sample;
//       }
//     });

//     setSamples(fetchedSamples);
//   };
//   fetchSamples();
// }, []);
