"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import useHotKeys from "./hooks/useHotKeys";
import MainMenu from "../components/MainMenu";

const DrumMachine = dynamic(() => import("../components/DrumMachine"), {
  ssr: false,
});

const SettingsWrapper = dynamic(() => import("../components/SettingsWrapper"), {
  ssr: false,
});

const CollectionMenu = dynamic(() => import("../components/CollectionMenu"), {
  ssr: false,
});

export default function Home() {
  useHotKeys();
  return (
    <div className="flex flex-col justify-center items-center my-5">
      <div className="w-[800px] p-1 xs:w-full sm:w-full md:w-[700px]">
        <div className="flex justify-between">
          <h1 className="text-6xl font-bold block">Citizen Sampler</h1>
          <MainMenu />
        </div>
        <CollectionMenu />
        <SettingsWrapper />
        <DrumMachine />
      </div>

      <p className="text-sm">
        Inspired by and built on
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
