"use client";
import DrumMachine from "./components/DrumMachine";
import { useAudioContext } from "./contexts/AudioContext";
import Link from "next/link";
import GenreBar from "./components/GenreBar";
import Transport from "./components/Transport";
import quantize from "./functions/quantize";

type QuantizeValue = 4 | 8 | 16;

export default function Home() {
  const { audioContext, fetchSamples, njbSamples } = useAudioContext();

  quantize(2, [4, 4], 120, 4);
  quantize(2, [4, 4], 120, 8);
  quantize(2, [4, 4], 120, 16);

  return (
    <div className="flex flex-col justify-center items-center my-5">
      <h1 className="text-xl font-bold block">Citizens Sampler</h1>
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
