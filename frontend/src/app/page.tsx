"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import MainMenu from "../components/MainMenu";
import DialogWrapper from "../components/Dialogs/DialogWrapper";
import ChooseSample from "../components/Dialogs/ChooseSample";
import AuthDialog from "../components/Dialogs/AuthDialog";
import ConfirmActionDialog from "../components/Dialogs/ConfirmActionDialog";
import SaveNewSong from "../components/Dialogs/SaveNewSong";
import LoadSong from "../components/Dialogs/LoadSong";
import CollectionMenu from "../components/Dialogs/CollectionMenu";
import KitMenu from "../components/Dialogs/KitMenu";
import APIResponseDialog from "../components/Dialogs/APIResponseDialog";
import UIWarning from "../components/Dialogs/UIWarning";
import Transport from "../components/Audio/Transport";
import Loop from "../components/Audio/Loop";
import { useUIContext } from "./contexts/UIContext";
import { useAudioContext } from "./contexts/AudioContext";
import ResendConfirmation from "src/components/Dialogs/ResendConfirmation";

const SampleSettings = dynamic(
  () => import("../components/Audio/SampleSettings"),
  {
    ssr: false,
  }
);

const DrumMachine = dynamic(() => import("../components/Audio/DrumMachine"), {
  ssr: false,
});

const PitchGrid = dynamic(() => import("../components/Audio/PitchGrid"), {
  ssr: false,
});

export default function Home() {
  const { showDialog } = useUIContext();
  const { samplersRef, selectedSampleId } = useAudioContext();
  const [makeBeatsPressed, setMakeBeatsPressed] = useState<boolean>(false);
  // useTransportHotKeys(hotKeysActive);

  return (
    <>
      {/* Main Content */}
      <div className="flex flex-col justify-center items-center my-5">
        <div className="w-[600px] lg:w-[800px] md:w-[800px] sm:w-[700px] xs:w-[600px]">
          <div className="flex justify-between">
            <h1 className="text-6xl font-bold block">Citizen Sampler</h1>
            <MainMenu />
          </div>
          <div className="flex">
            <SampleSettings />
            <div className="flex flex-col w-1/6">
              <Transport />
              <Loop />
            </div>
          </div>
          <div className="flex">
            <DrumMachine />
            <PitchGrid
              sampler={samplersRef.current[selectedSampleId]?.sampler ?? null}
            />
          </div>
        </div>
        <footer className="flex flex-col items-center mt-2">
          <p className="text-sm">
            Inspired and made possible by
            <Link
              className="m-1 text-sm text-blue-700"
              href="https://citizen-dj.labs.loc.gov/"
            >
              Citizen DJ
            </Link>
          </p>
          <p className="text-sm">
            and the
            <Link className="m-1 text-sm text-blue-700" href="https://loc.gov/">
              Library of Congress
            </Link>
          </p>
        </footer>
      </div>

      {/* Blur Overlay and Button - Only show when makeBeatsPressed is false */}
      {!makeBeatsPressed && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          {/* BACKDROP */}
          <div className="absolute inset-0 bg-slate-300 bg-opacity-10 backdrop-blur-sm z-30" />

          {/* BUTTON */}
          <button
            onClick={() => setMakeBeatsPressed(true)}
            className="relative z-40 px-6 py-3 border border-black shadow-md shadow-slate-800 bg-slate-400 text-white hover:bg-slate-600 rounded"
          >
            Make Beats
          </button>
        </div>
      )}

      {/* Menu Dialogues */}
      <div>
        {showDialog && (
          <DialogWrapper>
            {showDialog === "choose-sample" && <ChooseSample />}
            {showDialog === "load-song" && <LoadSong />}
            {showDialog === "save-new-song" && <SaveNewSong />}
            {showDialog === "collection-menu" && <CollectionMenu />}
            {showDialog === "kit-menu" && <KitMenu />}
            {showDialog === "auth-dialog" && <AuthDialog />}
            {showDialog === "resend-confirmation" && <ResendConfirmation />}
            {showDialog === "confirm-action" && <ConfirmActionDialog />}
            {showDialog === "api-response" && <APIResponseDialog />}
            {showDialog === "ui-warning" && <UIWarning />}
          </DialogWrapper>
        )}
      </div>
    </>
  );
}
