"use client";
import Image from "next/image";
import DrumMachine from "./components/DrumMachine";
import axios from "axios";
import { useEffect, useState } from "react";
import { SampleType } from "./types/SampleType";
import { useAudioContext } from "./contexts/AudioContext";

export default function Home() {
  const { audioContext, fetchSamples, njbSamples } = useAudioContext();

  return (
    <div className="flex flex-col justify-center items-center my-5 block">
      <h1 className="text-xl font-bold block">Drum the National Jukebox</h1>
      {njbSamples && <DrumMachine samples={njbSamples} />}
    </div>
  );
}
