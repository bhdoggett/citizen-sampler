"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import MainMenu from "../components/MainMenu";
import Spinner from "../components/Spinner";
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
import About from "src/components/Dialogs/About";

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
  const { showDialog, makeBeatsButtonPressed, setMakeBeatsButtonPressed } =
    useUIContext();
  const { samplersRef, selectedSampleId, samplersLoading } = useAudioContext();
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  useEffect(() => {
    if (samplersLoading) {
      // Reset the makeBeatsButtonPressed state when samplers are loading
      setMakeBeatsButtonPressed(false);
    }
  });

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setShowRotateNotice(isPortrait);
    };

    checkOrientation(); // check on mount

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return (
    <>
      {!showRotateNotice && (
        <>
          <div className="flex flex-col justify-center items-center mt-4 mb-6">
            <div className="w-[600px] lg:w-[800px] md:w-[800px] sm:w-[700px] xs:w-[600px] border-[3px] border-black bg-white p-3 rounded-lg shadow-lg shadow-black">
              {/* Header - NOT blurred */}
              <div className="flex justify-between">
                <h1 className="text-5xl font-bold block mb-3">
                  Citizen Sampler
                </h1>
                <MainMenu />
              </div>

              {/* Audio Components Container - This gets blurred */}
              <div className="relative">
                <div
                  className={`${samplersLoading || !makeBeatsButtonPressed ? "blur-sm" : ""}`}
                >
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
                      sampler={
                        samplersRef.current[selectedSampleId]?.sampler ?? null
                      }
                    />
                  </div>
                </div>

                {/* Overlay when content should be blurred */}
                {(samplersLoading || !makeBeatsButtonPressed) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    {samplersLoading ? (
                      // Show spinner when samplers are loading
                      <div className="flex items-center justify-center">
                        <Spinner />
                      </div>
                    ) : (
                      // Show button when samplers are loaded but button not pressed
                      <button
                        onClick={() => setMakeBeatsButtonPressed(true)}
                        className="border-2 border-black px-2 py-1 bg-slate-600 hover:bg-slate-700 shadow-md shadow-slate-700 text-white font-bold transition-colors"
                      >
                        Make Beats
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer - NOT blurred */}
            <footer className="flex flex-col items-center mt-2 text-white">
              <p className="text-sm">
                Inspired and made possible by
                <Link
                  className="m-1 text-sm text-blue-500 font-bold"
                  href="https://citizen-dj.labs.loc.gov/"
                >
                  Citizen DJ
                </Link>
              </p>
              <p className="text-sm">
                and the
                <Link
                  className="m-1 text-sm text-blue-500 font-bold"
                  href="https://loc.gov/"
                >
                  Library of Congress
                </Link>
              </p>
            </footer>
          </div>

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
                {showDialog === "about" && <About />}
              </DialogWrapper>
            )}
          </div>
        </>
      )}

      {/* Rotate to Landscape Overlay */}
      {showRotateNotice && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 text-white flex items-center justify-center text-center p-4">
          <p className="text-xl sm:text-2xl font-semibold">
            To make awesome music,
            <br />
            please rotate your device
            <br />
            to landscape mode
          </p>
        </div>
      )}
    </>
  );
}
