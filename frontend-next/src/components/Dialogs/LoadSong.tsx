"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useAuthContext } from "src/app/contexts/AuthContext";
import { useUIContext } from "src/app/contexts/UIContext";
import { SongTypeFE } from "src/types/audioTypesFE";
import { LOOP_NAMES } from "src/lib/constants/loops";
import Spinner from "../Spinner";
import { migrateDrumUrls } from "src/lib/drumMachines";
import { normalizeAllMuteSolo } from "src/lib/audio/muteSolo";
import {
  GENERIC_ERROR_MESSAGE,
  apiErrorMessage,
  getSong,
  listSongTitles,
} from "src/lib/api/client";
import styles from "./Dialog.module.css";

const LoadSong: React.FC = () => {
  const [songTitles, setSongTitles] = useState<string[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [hasCheckedForSongs, setHasCheckedForSongs] = useState<boolean>(false);
  const {
    setSongTitle,
    setAllSampleData,
    setAllLoopSettings,
    loadSamplersToRef,
    storeAudioInIndexedDB,
  } = useAudioContext();
  const { isAuthenticated, token } = useAuthContext();
  const { openDialog } = useUIContext();
  const [loading, setLoading] = useState<boolean>(false);

  const getSongtitles = useCallback(async () => {
    try {
      const result = await listSongTitles(token);

      // With no songs, the server sends a message instead of a list
      if (!Array.isArray(result)) {
        console.warn(result.message);
        setSongTitles([]);
        setSelectedSong("");
        openDialog({ type: "api-response", message: result.message });
        return;
      }

      // Select the first song
      setSongTitles(result);
      setSelectedSong(result[0]);
    } catch (error) {
      console.error("Error fetching song titles:", error);
    } finally {
      setHasCheckedForSongs(true);
    }
  }, [
    setSongTitles,
    setSelectedSong,
    token,
    openDialog,
  ]);

  const handleLoadSong = async (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    e.preventDefault();

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not loaded from DB.");
      return;
    }

    setLoading(true);
    // One response dialog per outcome, opened once loading finishes
    let message: string | null = null;

    try {
      const result = await getSong(token, selectedSong);
      const song: SongTypeFE = result.song;
      const { title, loops } = song;
      const samples = normalizeAllMuteSolo(migrateDrumUrls(song.samples));

      // Normalize loop settings for songs saved before isInitialized was added
      const normalizedLoops: Record<string, unknown> = { ...loops };
      for (const key of LOOP_NAMES) {
        const loop = normalizedLoops[key] as Record<string, unknown> | null;
        if (loop && !("isInitialized" in loop)) {
          normalizedLoops[key] = { ...loop, isInitialized: true };
        }
      }

      localStorage.setItem("songId", song._id!);
      setSongTitle(title);
      setAllSampleData(samples);
      setAllLoopSettings(normalizedLoops as SongTypeFE["loops"]);

      await loadSamplersToRef(samples);
      // Store all new samples in IndexedDB
      for (const [sampleId, sample] of Object.entries(samples)) {
        await storeAudioInIndexedDB(sample.url, sampleId);
      }
      message = result.message;
    } catch (err) {
      console.error("Error loading song from DB:", err);
      message = apiErrorMessage(err, GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
      if (message) {
        openDialog({ type: "api-response", message });
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      getSongtitles();
    }
  }, [getSongtitles, isAuthenticated]);

  // Don't render anything until we've checked for songs
  if (!hasCheckedForSongs) {
    return null;
  }

  return (
    songTitles.length > 0 && (
      <form onSubmit={handleLoadSong} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="song-from-db" className={styles.label}>
            Songs
          </label>
          <select
            name="song-from-db"
            id="song-from-db"
            value={selectedSong ?? ""}
            onChange={(e) => setSelectedSong(e.target.value)}
            className={styles.select}
          >
            {songTitles.map((song: string) => (
              <option key={song} value={song}>
                {song}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.spinnerSlot}>
            <Spinner />
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.button} ${styles.primary}`}
            >
              Load
            </button>
          </div>
        )}
      </form>
    )
  );
};

export default LoadSong;
