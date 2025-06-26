"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useAuthContext } from "src/app/contexts/AuthContext";
import { useUIContext } from "src/app/contexts/UIContext";
import { SongTypeFE } from "src/types/audioTypesFE";
import Spinner from "../Spinner";

dotenv.config();
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const LoadSong: React.FC = () => {
  const [songTitles, setSongTitles] = useState<string[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [hasCheckedForSongs, setHasCheckedForSongs] = useState<boolean>(false);
  const {
    setSongTitle,
    setAllSampleData,
    setAllLoopSettings,
    loadSamplersToRef,
  } = useAudioContext();
  const { isAuthenticated, token } = useAuthContext();
  const { apiResponseMessageRef, setShowDialog } = useUIContext();
  const [loading, setLoading] = useState<boolean>(false);

  const getSongtitles = useCallback(async () => {
    try {
      const result = await axios.get(`${BASE_URL}/beats/me/songs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // If no songs are found, set songTitles to an empty array and show a message
      if (result.data.message === "No songs found") {
        console.warn(result.data.message);
        setSongTitles([]);
        setSelectedSong("");
        apiResponseMessageRef.current = result.data.message;
        setShowDialog("api-response");
        return;
      }

      // If we have songs, set the song titles and select the first one
      if (result.status === 200) {
        const titles = result.data;

        setSongTitles(titles);
        setSelectedSong(titles[0]);
      }
    } catch (error) {
      console.error("Error fetching song titles:", error);
    } finally {
      setHasCheckedForSongs(true);
    }
  }, [
    setSongTitles,
    setSelectedSong,
    token,
    setShowDialog,
    apiResponseMessageRef,
  ]);

  const handleLoadSong = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    let showDialogAfter = false;
    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not saved to DB.");
      return;
    }

    try {
      const result = await axios.get(
        `${BASE_URL}/beats/me/songs/${selectedSong}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (result.status === 200) {
        const song: SongTypeFE = result.data.song;
        const { title, samples, loops } = song;
        setSongTitle(title);
        setAllSampleData(samples);
        setAllLoopSettings(loops);

        await loadSamplersToRef(samples);
        apiResponseMessageRef.current = result.data.message;
        showDialogAfter = true;
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        console.error("Error loading song from DB:", error);
        apiResponseMessageRef.current = error.response.data.message;
      } else {
        apiResponseMessageRef.current = "An unexpected error occured";
      }
      setShowDialog("api-response");
    } finally {
      setLoading(false);
      if (showDialogAfter) {
        setShowDialog("api-response");
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      getSongtitles();
    }
  }, [getSongtitles, isAuthenticated]);

  // // Set error to null when component unmounts
  // useEffect(() => {
  //   return () => {
  //     // setShowDialog(null);
  //     apiResponseMessageRef.current = null;
  //   };
  // }, []);

  // Don't render anything until we've checked for songs
  if (!hasCheckedForSongs) {
    return null;
  }

  // Only render the form if there are songs
  return (
    songTitles.length > 0 && (
      <form onSubmit={handleLoadSong}>
        <div>
          <label htmlFor="load-songs" className="text-white">
            Songs:
          </label>
          <select
            name="song-from-db"
            id="song-from-db"
            value={selectedSong ?? ""}
            onChange={(e) => setSelectedSong(e.target.value)}
            className="shadow-inner text-black shadow-slate-700 w-full"
          >
            {songTitles.map((song: string) => (
              <option key={song} value={song} className="w-full text-ellipsis">
                {song}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="mt-3">
            <Spinner />
          </div>
        ) : (
          <button
            type="submit"
            className="flex mx-auto justify-center border border-black mt-4 px-2 py-1 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-fit"
          >
            Load
          </button>
        )}
      </form>
    )
  );
};

export default LoadSong;
