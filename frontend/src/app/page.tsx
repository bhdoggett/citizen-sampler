"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import useHotKeys from "./hooks/useHotKeys";

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
      <h1 className="text-6xl font-bold block">Citizen Sampler</h1>
      <CollectionMenu />
      <SettingsWrapper />
      <DrumMachine />
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
