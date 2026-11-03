"use client";
import React, { useState } from "react";
import { useSongStore } from "src/lib/song/react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useAuthContext } from "src/app/contexts/AuthContext";
import { useUIContext } from "src/app/contexts/UIContext";
import {
  GENERIC_ERROR_MESSAGE,
  apiErrorMessage,
  createSong,
} from "src/lib/api/client";
import styles from "./Dialog.module.css";

const SaveNewSong: React.FC = () => {
  const [formSongTitle, setFormSongTitle] = useState<string>("");
  // const [apiResponse, setApiResponse] = useState<string | null>(null);
  const { setSongTitle, setSongId } = useAudioContext();
  const store = useSongStore();
  const { isAuthenticated, token, userId } = useAuthContext();
  const { openDialog } = useUIContext();

  const handleSaveNewSong = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not saved to DB.");
      return;
    }

    const { samples, loops } = store.getState();
    const songData = {
      song: {
        title: formSongTitle,
        loops,
        samples,
      },
      userId,
    };

    try {
      const result = await createSong(token, songData);
      setSongId(result.song._id ?? "");
      setSongTitle(formSongTitle);
      openDialog({ type: "api-response", message: result.message });
    } catch (err) {
      console.error("Error saving song to DB:", err);
      openDialog({
        type: "api-response",
        message: apiErrorMessage(err, GENERIC_ERROR_MESSAGE),
      });
    }
  };

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
