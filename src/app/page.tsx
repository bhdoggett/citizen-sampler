"use client";
import DrumMachine from "./components/DrumMachine";
import Link from "next/link";
import GenreBar from "./components/GenreBar";
import CollectionMenu from "./components/CollectionMenu";
import Transport from "./components/Transport";
import SampleSettings from "./components/SampleSettings";

export default function Home() {
  return (
    <div className="flex flex-col justify-center items-center my-5">
      <h1 className="text-xl font-bold block">Citizen Sampler</h1>
      <GenreBar />
      <CollectionMenu />
      <Transport />
      <DrumMachine />
      <SampleSettings />
      <p className="text-sm">
        Inspired by
        <Link
          className="m-1 text-sm text-blue-700"
          href="https://citizen-dj.labs.loc.gov/"
        >
          Citizen DJ
        </Link>
      </p>
      <p className="text-sm">
        Samples curated and made available by the
        <Link className="m-1 text-sm text-blue-700" href="https://loc.gov/">
          Library of Congress
        </Link>
      </p>
    </div>
  );
}
