import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { useAudioContext } from "../../contexts/AudioContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useUIContext } from "../../contexts/UIContext";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// type SaveNewSongProps = {
//   setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
//   setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
// };

const SaveNewSong: React.FC = () => {
  const [formSongTitle, setFormSongTitle] = useState<string>("");
  // const [apiResponse, setApiResponse] = useState<string | null>(null);
  const { setSongTitle, allSampleData, allLoopSettings } = useAudioContext();
  const { isAuthenticated, token, userId } = useAuthContext();
  const { apiResponseMessageRef, setShowDialog } = useUIContext();

  const handleSaveNewSong = async (e: React.FormEvent<HTMLFormElement>) => {
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
      userId,
    };

    try {
      const result = await axios.post(`${BASE_URL}/beats/me/songs`, songData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (result.status === 201) {
        localStorage.setItem("songId", result.data.song._id);
        setSongTitle(formSongTitle);
        apiResponseMessageRef.current = result.data.message;
        setShowDialog("api-response");
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        console.error("Error saving song to DB:", error);
        apiResponseMessageRef.current = error.response.data.message;
      } else {
        apiResponseMessageRef.current = "An unexpeced error occurred";
      }
      setShowDialog("api-response");
    }
  };

  // Set error to null when component unmounts
  useEffect(() => {
    return () => {
      apiResponseMessageRef.current = null;
    };
  }, []);

  return (
    <form onSubmit={handleSaveNewSong}>
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
