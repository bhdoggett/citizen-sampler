"use client";
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
import { useAuthContext } from "./contexts/AuthContext";
import { useAudioContext } from "./contexts/AudioContext";

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
  const { showDialog, setShowDialog, confirmActionRef, setHotKeysActive } =
    useUIContext();
  const { authIsSignup, setAuthIsSignup } = useAuthContext();
  const { samplersRef, selectedSampleId } = useAudioContext();
  // useTransportHotKeys(hotKeysActive);

  return (
    <>
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
        <div className="flex flex-col items-center mt-2">
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
        </div>
      </div>
      <div>
        {/* --Menu Dialogues-- */}

        {showDialog && (
          <DialogWrapper>
            {showDialog === "choose-sample" && <ChooseSample />}
            {showDialog === "load-song" && <LoadSong />}
            {showDialog === "save-new-song" && <SaveNewSong />}
            {showDialog === "collection-menu" && (
              <CollectionMenu
                setShowDialog={setShowDialog}
                setHotKeysActive={setHotKeysActive}
              />
            )}
            {showDialog === "kit-menu" && (
              <KitMenu
                setShowDialog={setShowDialog}
                setHotKeysActive={setHotKeysActive}
              />
            )}
            {showDialog === "auth-dialogue" && (
              <AuthDialog
                authIsSignup={authIsSignup}
                setAuthIsSignup={setAuthIsSignup}
              />
            )}
            {showDialog === "confirm-action" && (
              <ConfirmActionDialog
                confirmActionRef={confirmActionRef}
                setShowDialog={setShowDialog}
                setHotKeysActive={setHotKeysActive}
              />
            )}
            {showDialog === "api-response" && <APIResponseDialog />}
            {showDialog === "ui-warning" && <UIWarning />}
          </DialogWrapper>
        )}
      </div>
    </>
  );
}
