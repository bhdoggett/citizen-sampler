"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import useHotKeys from "./hooks/useHotKeys";
import MainMenu from "../components/MainMenu";
import DialogWrapper from "../components/Dialogs/DialogWrapper";
import AuthDialog from "../components/Dialogs/AuthDialog";
import ConfirmActionDialog from "../components/Dialogs/ConfirmActionDialog";
import SaveNewSong from "../components/Dialogs/SaveNewSong";
import CollectionMenu from "../components/Dialogs/CollectionMenu";
import { useUIContext } from "./contexts/UIContext";
import { useAuthContext } from "./contexts/AuthContext";

const SettingsWrapper = dynamic(
  () => import("../components/Audio/SettingsWrapper"),
  {
    ssr: false,
  }
);

const DrumMachine = dynamic(() => import("../components/Audio/DrumMachine"), {
  ssr: false,
});

export default function Home() {
  const [hotKeysActive, setHotKeysActive] = useState<boolean>(true);
  const { showDialog, setShowDialog, confirmActionRef } = useUIContext();
  const { authIsSignup, setAuthIsSignup } = useAuthContext();
  useHotKeys(hotKeysActive);

  return (
    <div className="flex flex-col justify-center items-center my-5">
      <div className="w-[800px] p-1 xs:w-full sm:w-full md:w-[700px]">
        <div className="flex justify-between">
          <h1 className="text-6xl font-bold block">Citizen Sampler</h1>
          <MainMenu setHotKeysActive={setHotKeysActive} />
        </div>
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
      {/* --Menu Dialogues-- */}

      {showDialog && (
        <DialogWrapper>
          {showDialog === "save-song" && (
            <SaveNewSong
              setShowDialog={setShowDialog}
              setHotKeysActive={setHotKeysActive}
            />
          )}
          {showDialog === "collection-menu" && (
            <CollectionMenu
              setShowDialog={setShowDialog}
              setHotKeysActive={setHotKeysActive}
            />
          )}
          {showDialog === "auth-dialogue" && (
            <AuthDialog
              setShowDialog={setShowDialog}
              setHotKeysActive={setHotKeysActive}
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
        </DialogWrapper>
      )}
    </div>
  );
}
