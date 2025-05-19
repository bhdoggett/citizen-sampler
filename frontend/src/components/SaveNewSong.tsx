"use client";
import React, { useState } from "react";
import { useAudioContext } from "../app/contexts/AudioContext";

type SaveNewSongProps = {
  setShowDialogue: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const SaveNewSong: React.FC<SaveNewSongProps> = ({
  setShowDialogue,
  setHotKeysActive,
}) => {
  const { setSongTitle } = useAudioContext();
  const [formSongTitle, setFormSongTitle] = useState("");

  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 top-6 z-30 w-[650px] rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="flex flex-col border-2 border-black bg-slate-800 m-3 p-4 shadow-md shadow-slate-800 text-white">
        <button
          onClick={() => setShowDialogue(null)}
          className="absolute top-5 right-6 text-white hover:text-black"
        >
          ✖
        </button>
        <form>
          <label htmlFor="song-title" className="text-white w-1/4">
            Song Name:
          </label>
          <input
            type="text"
            name="song-title"
            id="song-title"
            className="pl-1 text-black shadow-inner shadow-slate-700 w-3/4"
            value={formSongTitle}
            onChange={(e) => setFormSongTitle(e.target.value)}
          />

          <button
            onClick={(e) => {
              e.preventDefault();
              setSongTitle(formSongTitle);
              setShowDialogue(null);
              setHotKeysActive(true);
            }}
            className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-1/4"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
};

export default SaveNewSong;
