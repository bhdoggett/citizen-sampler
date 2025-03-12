"use client";
import DrumMachine from "./components/DrumMachine";
import { useAudioContext } from "./contexts/AudioContext";
import Link from "next/link";
import GenreBar from "./components/GenreBar";
import Transport from "./components/Transport";
import SampleSettings from "./components/SampleSettings";

type QuantizeValue = 4 | 8 | 16;

export default function Home() {
  const { audioContext, fetchSamples, locSamples } = useAudioContext();

  return (
    <div className="flex flex-col justify-center items-center my-5">
      <h1 className="text-xl font-bold block">Citizens Sampler</h1>
      <GenreBar />
      <Transport />
      {locSamples && <DrumMachine samples={locSamples} />}
      <Link
        className="text-sm text-blue-700"
        href="https://citizen-dj.labs.loc.gov/"
      >
        Learn About the Citzen DJ
      </Link>
    </div>
  );
}
