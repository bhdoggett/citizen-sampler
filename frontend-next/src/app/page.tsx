"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useSongStore } from "src/lib/song/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./page.module.css";
import MainMenu from "../components/MainMenu";
import DesktopDownload from "../components/DesktopDownload";
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
import { isLoopName } from "src/lib/constants/loops";
import { readString, writeString } from "src/lib/storage";
import { needsAudioUnlock } from "src/lib/desktop";
import { hasJuceBackend } from "src/lib/engine/juce/juceBridgeEngine";
import useFitToWindow from "src/lib/useFitToWindow";
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
    dialog,
    openDialog,
    makeBeatsButtonPressed,
    setMakeBeatsButtonPressed,
    sequencerVisible,
    setSequencerVisible,
    hotKeysActive,
  } = useUIContext();
  const { selectedSampleId, samplersLoading, updateSamplerStateSettings } = useAudioContext();
  const store = useSongStore();
  const handleSelectLoop = useSelectLoop();

  const padsViewRef = useRef<HTMLDivElement>(null);

  // The desktop app and plugin scale the UI to fill their window. Read after
  // mount: the static export renders without the JUCE backend.
  const fitRef = useRef<HTMLDivElement>(null);
  const [fitToWindow, setFitToWindow] = useState(false);
  useEffect(() => setFitToWindow(hasJuceBackend()), []);
  useFitToWindow(fitRef, fitToWindow);

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
        if (isLoopName(key)) {
          e.preventDefault();
          handleSelectLoop(key);
        } else if (key === "S") {
          e.preventDefault();
          setSequencerVisible(true);
        } else if (key === "P") {
          e.preventDefault();
          setSequencerVisible(false);
        } else if (key === "Q") {
          e.preventDefault();
          const pad = store.getState().samples[selectedSampleId];
          if (pad) {
            const current = pad.settings.quantize;
            updateSamplerStateSettings(selectedSampleId, { quantize: !current });
          }
        }
      }

      // Help & Shortcuts: Shift + / (often '?')
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        openDialog({ type: "help-shortcuts" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotKeysActive, handleToggleSequencer, handleSelectLoop, setSequencerVisible, selectedSampleId, store, updateSamplerStateSettings, openDialog]);

  // First-run welcome dialog (shown once per browser)
  useEffect(() => {
    if (dialog) return;
    if (!readString("citizenSamplerHasSeenWelcome")) {
      writeString("citizenSamplerHasSeenWelcome", "true");
      openDialog({ type: "welcome" });
    }
  }, [dialog, openDialog]);

  const contentHidden =
    samplersLoading || needsAudioUnlock(makeBeatsButtonPressed);

  return (
    <>
      <div className={fitToWindow ? `${styles.page} ${styles.pageFit}` : styles.page}>
        <div ref={fitRef} className={fitToWindow ? styles.fitBox : styles.fitBoxOff}>
          <div className={styles.frame}>
            {/* Header - NOT blurred */}
            <header className={styles.header}>
              <h1 className={styles.title}>Citizen Sampler</h1>
              <DesktopDownload />
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
                    {/* DrumMachine stays mounted so its pad hotkeys work from the sequencer view */}
                    <div
                      ref={padsViewRef}
                      className={sequencerVisible ? styles.hidden : styles.padsView}
                    >
                      <DrumMachine />
                      <PitchGrid />
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
      </div>

      {/* Menu Dialogues */}
      <div>
        {dialog && (
          <DialogWrapper>
            {dialog.type === "choose-sample" && <ChooseSample />}
            {dialog.type === "load-song" && <LoadSong />}
            {dialog.type === "save-new-song" && <SaveNewSong />}
            {dialog.type === "collection-menu" && <CollectionMenu />}
            {dialog.type === "kit-menu" && <KitMenu />}
            {dialog.type === "auth-dialog" && <AuthDialog />}
            {dialog.type === "confirm-action" && (
              <ConfirmActionDialog {...dialog} />
            )}
            {dialog.type === "api-response" && (
              <APIResponseDialog message={dialog.message} />
            )}
            {dialog.type === "ui-warning" && (
              <UIWarning message={dialog.message} />
            )}
            {dialog.type === "about" && <About />}
            {dialog.type === "help-shortcuts" && <HelpShortcuts />}
            {dialog.type === "welcome" && <Welcome />}
          </DialogWrapper>
        )}
      </div>
    </>
  );
}
