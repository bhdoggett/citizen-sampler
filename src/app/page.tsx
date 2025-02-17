"use client";
import DrumMachine from "./components/DrumMachine";
import { useAudioContext } from "./contexts/AudioContext";
import Link from "next/link";
import GenreBar from "./components/GenreBar";
import Transport from "./components/Transport";

export default function Home() {
  const { audioContext, fetchSamples, njbSamples } = useAudioContext();

  return (
    <div className="flex flex-col justify-center items-center my-5">
      <h1 className="text-xl font-bold block">Drum the National Jukebox</h1>
      <GenreBar />
      <Transport />
      {njbSamples && <DrumMachine samples={njbSamples} />}
      <Link
        className="text-sm text-blue-700"
        href="https://www.loc.gov/collections/national-jukebox/about-this-collection/"
      >
        Learn About the National JukeBox
      </Link>
    </div>
  );
}
