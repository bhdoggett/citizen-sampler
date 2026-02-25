"use client";
import { useEffect, useRef, useCallback, useState } from "react";
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
import MidiHandler from "../components/Audio/MidiHandler";
import { useUIContext } from "./contexts/UIContext";
import { useAudioContext } from "./contexts/AudioContext";
import { useSelectLoop } from "./hooks/useSelectLoop";
import type { LoopName } from "@shared/types/audioTypes";
import ResendConfirmation from "src/components/Dialogs/ResendConfirmation";
import About from "src/components/Dialogs/About";
import HelpShortcuts from "src/components/Dialogs/HelpShortcuts";
import Welcome from "src/components/Dialogs/Welcome";

const SampleSettings = dynamic(
  () => import("../components/Audio/SampleSettings"),
  {
    ssr: false,
  },
);

const DrumMachine = dynamic(() => import("../components/Audio/DrumMachine"), {
  ssr: false,
});

const PitchGrid = dynamic(() => import("../components/Audio/PitchGrid"), {
  ssr: false,
});

const StepSequencer = dynamic(
  () =>
    import("../components/Audio/StepSequencer/StepSequencer").then(
      (mod) => mod.default,
    ),
  {
    ssr: false,
  },
);

export default function Home() {
  const {
    showDialog,
    setShowDialog,
    makeBeatsButtonPressed,
    setMakeBeatsButtonPressed,
    sequencerVisible,
    setSequencerVisible,
    hotKeysActive,
  } = useUIContext();
  const { samplersRef, selectedSampleId, samplersLoading, allSampleData, updateSamplerStateSettings } = useAudioContext();
  const handleSelectLoop = useSelectLoop();

  const padsViewRef = useRef<HTMLDivElement>(null);
  const [padsViewHeight, setPadsViewHeight] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    if (samplersLoading) {
      // Reset the makeBeatsButtonPressed state when samplers are loading
      setMakeBeatsButtonPressed(false);
    }
  });

  useEffect(() => {
    if (!padsViewRef.current || sequencerVisible) return;
    const height = padsViewRef.current.getBoundingClientRect().height;
    setPadsViewHeight(height);
  }, [sequencerVisible]);

  const handleToggleSequencer = useCallback(() => {
    setSequencerVisible((prev) => !prev);
  }, [setSequencerVisible]);

  useEffect(() => {
    if (!hotKeysActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && e.metaKey) {
        e.preventDefault();
        handleToggleSequencer();
        return;
      }

      if (e.shiftKey) {
        const key = e.key.toUpperCase();
        if (key === "A" || key === "B" || key === "C" || key === "D") {
          e.preventDefault();
          handleSelectLoop(key as LoopName);
        } else if (key === "S") {
          e.preventDefault();
          setSequencerVisible(true);
        } else if (key === "P") {
          e.preventDefault();
          setSequencerVisible(false);
        } else if (key === "Q") {
          e.preventDefault();
          if (selectedSampleId && allSampleData[selectedSampleId]) {
            const current = allSampleData[selectedSampleId].settings.quantize;
            updateSamplerStateSettings(selectedSampleId, { quantize: !current });
          }
        }
      }

      // Help & Shortcuts: Shift + / (often '?')
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowDialog("help-shortcuts");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotKeysActive, handleToggleSequencer, handleSelectLoop, setSequencerVisible, selectedSampleId, allSampleData, updateSamplerStateSettings, setShowDialog]);

  // First-run welcome dialog (shown once per browser)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (showDialog) return;
    const KEY = "citizenSamplerHasSeenWelcome";
    const hasSeen = window.localStorage.getItem(KEY);
    if (!hasSeen) {
      window.localStorage.setItem(KEY, "true");
      setShowDialog("welcome");
    }
  }, [showDialog, setShowDialog]);

  return (
    <>
      (
      <>
        <div className="flex flex-col justify-center items-center mt-4 mb-6">
          <div className="w-[600px] lg:w-[800px] md:w-[800px] sm:w-[700px] xs:w-[600px] border-[3px] border-black bg-white p-3 rounded-lg shadow-lg shadow-black">
            {/* Header - NOT blurred */}
            <div className="flex justify-between items-center">
              <h1 className="text-5xl font-bold block mb-3">Citizen Sampler</h1>
              <MidiHandler />
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
                  {/* Play / Seq toggle buttons */}
                  <div className="flex flex-col gap-1 mt-1 mr-1">
                    <button
                      onClick={() => setSequencerVisible(false)}
                      className={`flex flex-1 px-2 py-1 text-xs border-2 border-black cursor-pointer ${
                        !sequencerVisible
                          ? "bg-slate-600 text-white font-bold shadow-inner shadow-black"
                          : "bg-slate-200 text-black shadow-sm shadow-slate-500"
                      }`}
                      title="PADS (Shift + P)"
                    >
                      <span className="[writing-mode:vertical-lr] rotate-180">
                        PADS
                      </span>
                    </button>
                    <button
                      onClick={() => setSequencerVisible(true)}
                      className={`flex flex-1 px-2 py-1 text-xs border-2 border-black cursor-pointer ${
                        sequencerVisible
                          ? "bg-slate-600 text-white font-bold shadow-inner shadow-black"
                          : "bg-slate-200 text-black shadow-sm shadow-slate-500"
                      }`}
                      title="SEQUENCER (Shift + S)"
                    >
                      <span className="[writing-mode:vertical-lr] rotate-180">
                        SEQUENCER
                      </span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* DrumMachine must stay mounted for Tone.Part playback scheduling */}
                    <div
                      ref={padsViewRef}
                      className={sequencerVisible ? "hidden" : "flex"}
                    >
                      <DrumMachine />
                      <PitchGrid
                        sampler={
                          samplersRef.current[selectedSampleId]?.sampler ?? null
                        }
                      />
                    </div>
                    {sequencerVisible && (
                      <StepSequencer maxHeight={padsViewHeight} />
                    )}
                  </div>
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
              {showDialog === "help-shortcuts" && <HelpShortcuts />}
              {showDialog === "welcome" && <Welcome />}
            </DialogWrapper>
          )}
        </div>
      </>
      )
    </>
  );
}
