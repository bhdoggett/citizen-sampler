"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./page.module.css";
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
import type { LoopName } from "../types/audioTypes";
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

  const contentHidden = samplersLoading || !makeBeatsButtonPressed;

  return (
    <>
      <div className={styles.page}>
        <div className={styles.frame}>
          {/* Header - NOT blurred */}
          <header className={styles.header}>
            <h1 className={styles.title}>Citizen Sampler</h1>
            <MidiHandler />
            <MainMenu />
          </header>

          {/* Audio Components Container - This gets blurred */}
          <div className={styles.workspace}>
            <div className={contentHidden ? styles.blurred : undefined}>
              <div className={styles.topRow}>
                <SampleSettings />
                <div className={styles.sideColumn}>
                  <Transport />
                  <Loop />
                </div>
              </div>
              <div className={styles.bottomRow}>
                {/* Pads / Sequencer toggle */}
                <div className={styles.viewTabs}>
                  <button
                    onClick={() => setSequencerVisible(false)}
                    className={`${styles.viewTab} ${!sequencerVisible ? styles.viewTabActive : ""}`}
                    title="PADS (Shift + P)"
                  >
                    <span className={styles.viewTabLabel}>PADS</span>
                  </button>
                  <button
                    onClick={() => setSequencerVisible(true)}
                    className={`${styles.viewTab} ${sequencerVisible ? styles.viewTabActive : ""}`}
                    title="SEQUENCER (Shift + S)"
                  >
                    <span className={styles.viewTabLabel}>SEQUENCER</span>
                  </button>
                </div>

                <div className={styles.views}>
                  {/* DrumMachine must stay mounted for Tone.Part playback scheduling */}
                  <div
                    ref={padsViewRef}
                    className={sequencerVisible ? styles.hidden : styles.padsView}
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
            {contentHidden && (
              <div className={styles.overlay}>
                {samplersLoading ? (
                  <Spinner />
                ) : (
                  <button
                    onClick={() => setMakeBeatsButtonPressed(true)}
                    className={styles.makeBeats}
                  >
                    Make Beats
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - NOT blurred */}
        <footer className={styles.footer}>
          <p>
            Inspired and made possible by{" "}
            <Link href="https://citizen-dj.labs.loc.gov/">Citizen DJ</Link>
          </p>
          <p>
            and the <Link href="https://loc.gov/">Library of Congress</Link>
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
  );
}
