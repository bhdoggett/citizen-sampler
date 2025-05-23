"use client";
import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { BASE_URL } from "./AuthDialog";
import type { SampleType } from "@shared/types/audioTypes";
import type { AllLoopSettings } from "@shared/types/audioTypes";
import { useAuthContext } from "frontend/src/app/contexts/AuthContext";

console.log("BASE_URL", BASE_URL);

type SaveNewSongProps = {
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const SaveNewSong: React.FC<SaveNewSongProps> = ({
  setShowDialog,
  setHotKeysActive,
}) => {
  const [formSongTitle, setFormSongTitle] = useState("");
  const { setSongTitle, allSampleData, allLoopSettings } = useAudioContext();
  const { error, setError } = useAuthContext();

  const handleSave = async (
    formSongTitle: string,
    allSampleData: Record<string, SampleType>,
    allLoopSettings: AllLoopSettings
  ) => {
    try {
      const result = await axios.post(`${BASE_URL}/me/songs`, {
        title: formSongTitle,
        loops: allLoopSettings,
        samples: allSampleData,
      });

      console.log("result", result);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(error.response.data.message);
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  // Set error to null when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return error ? (
    <>
      <span className="text-center text-lg font-bold mb-3">{error}</span>
      <button
        onClick={() => {
          setError(null);
        }}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        Try Again?
      </button>
    </>
  ) : (
    <>
      <div className="flex flex-col w-full max-w-sm mx-auto">
        <label htmlFor="song-title" className="text-white">
          Song Name:
        </label>
        <input
          type="text"
          name="song-title"
          id="song-title"
          className="pl-1 text-black shadow-inner shadow-slate-700 w-full"
          value={formSongTitle}
          onChange={(e) => setFormSongTitle(e.target.value)}
        />
      </div>

      <button
        onClick={async () => {
          await handleSave(formSongTitle, allSampleData, allLoopSettings);
          setSongTitle(formSongTitle);
          setShowDialog(null);
          setHotKeysActive(true);
        }}
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-1/4"
      >
        Save
      </button>
    </>
  );
};

export default SaveNewSong;
