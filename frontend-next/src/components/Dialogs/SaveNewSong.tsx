"use client";
import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useAuthContext } from "src/app/contexts/AuthContext";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";
dotenv.config();
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
    <form onSubmit={handleSaveNewSong} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="song-title" className={styles.label}>
          Song name
        </label>
        <input
          type="text"
          name="song-title"
          id="song-title"
          className={styles.input}
          autoFocus
          value={formSongTitle}
          onChange={(e) => setFormSongTitle(e.target.value)}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={`${styles.button} ${styles.primary}`}
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default SaveNewSong;
