"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useAuthContext } from "frontend/src/app/contexts/AuthContext";
import { useUIContext } from "frontend/src/app/contexts/UIContext";
import { SongTypeFE } from "@shared/types/audioTypes";
dotenv.config();
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const LoadSong: React.FC = () => {
  const [songTitles, setSongTitles] = useState<string[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const { setSongTitle, setAllSampleData, setAllLoopSettings } =
    useAudioContext();
  const { isAuthenticated, token } = useAuthContext();
  const { apiResponseMessageRef, setShowDialog } = useUIContext();

  const getSongtitles = useCallback(async () => {
    try {
      const result = await axios.get(`${BASE_URL}/beats/me/songs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (result.status === 200) {
        const titles = result.data;
        setSongTitles(titles);
        setSelectedSong(titles[0]);
      }
    } catch (error) {
      console.error("Error fetching song titles:", error);
    }
  }, [setSongTitles, setSelectedSong, token]);

  useEffect(() => {
    if (isAuthenticated) {
      getSongtitles();
    }
  }, [isAuthenticated, getSongtitles]);

  const handleLoadSong = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
        console.error("Error loading song from DB:", error);
        apiResponseMessageRef.current = error.response.data.message;
      } else {
        apiResponseMessageRef.current = "An unexpected error occured";
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

        <button
          type="submit"
          className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-fit"
        >
          Load
        </button>
      </form>
    )
  );
};

export default LoadSong;
