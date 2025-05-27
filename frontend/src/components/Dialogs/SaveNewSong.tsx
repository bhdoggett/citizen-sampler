"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useAuthContext } from "frontend/src/app/contexts/AuthContext";
import { BASE_URL } from "./AuthDialog";

console.log("BASE_URL", BASE_URL);

// type SaveNewSongProps = {
//   setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
//   setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
// };

const SaveNewSong: React.FC = () => {
  const [formSongTitle, setFormSongTitle] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const { setSongTitle, allSampleData, allLoopSettings } = useAudioContext();
  const { isAuthenticated, token, username } = useAuthContext();

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not saved to DB.");
      return;
    }

    const songData = {
      song: {
        title: formSongTitle,
        loops: allLoopSettings,
        samples: allSampleData,
      },
      username: username,
    };
    console.log("songData", songData);

    try {
      const result = await axios.post(`${BASE_URL}/beats/me/songs`, songData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (result.status === 201) {
        console.log("Song saved to DB:", result.data);
        setApiResponse(result.data.message);
        setSongTitle(formSongTitle);
      }
    } catch (error) {
      console.error("Error saving song to DB:", error);
      setApiResponse("Error saving song to DB");
    }
  };

  // Set error to null when component unmounts
  useEffect(() => {
    return () => {
      setApiResponse(null);
    };
  }, []);

  return apiResponse ? (
    <>
      <span className="text-center text-lg font-bold mb-3">{apiResponse}</span>
    </>
  ) : (
    <form onSubmit={handleSave}>
      <div>
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
        type="submit"
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-1/4"
      >
        Save
      </button>
    </form>
  );
};

export default SaveNewSong;
