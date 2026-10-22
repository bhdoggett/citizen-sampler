"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Tone from "tone";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useAuthContext } from "../app/contexts/AuthContext";
import { useAudioContext } from "../app/contexts/AudioContext";
import { useUIContext } from "../app/contexts/UIContext";
import useDownloadWavStems from "../app/hooks/useDownloadWavStems";
import styles from "./MainMenu.module.css";
dotenv.config();
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type ConfirmActionRef = {
  message: string;
  buttonText: string;
  action: () => void;
} | null;

const Menu: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const {
    isAuthenticated,
    token,
    setToken,
    userId,
    setUserId,
    setUsername,
    displayName,
    setDisplayName,
    setError,
  } = useAuthContext();
  const {
    confirmActionRef,
    showDialog,
    setShowDialog,
    apiResponseMessageRef,
    setHotKeysActive,
  } = useUIContext();
  const {
    songTitle,
    allLoopSettings,
    setAllLoopSettings,
    setCurrentLoop,
    allSampleData,
    setSongTitle,
    setSongId,
    initLocSamplesFromAllCollections,
    initKitSamples,
    setAllSampleData,
    loadSamplersToRef,
  } = useAudioContext();
  const downloadAllWavStems = useDownloadWavStems();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
    setToken(null);
    setUserId(null);
    setUsername(null);
    setDisplayName(null);
    setShowDialog("confirm-action");
    if (setError) setError("Session expired. Please log in again.");
  };

  const handleReset = async () => {
    // Clear persistent localStorage copies
    localStorage.removeItem("loops");
    localStorage.removeItem("samples");

    setAllLoopSettings({
      A: { beats: 4, bars: 2, bpm: 120, swing: 0, isInitialized: true },
      B: { beats: 4, bars: 2, bpm: 120, swing: 0, isInitialized: false },
      C: { beats: 4, bars: 2, bpm: 120, swing: 0, isInitialized: false },
      D: { beats: 4, bars: 2, bpm: 120, swing: 0, isInitialized: false },
    });
    setCurrentLoop("A");
    const locSamples = initLocSamplesFromAllCollections();
    const kitSamples = initKitSamples("mpc");
    setAllSampleData({ ...locSamples, ...kitSamples });

    await loadSamplersToRef({ ...locSamples, ...kitSamples });
  };

  const handleSaveSong = async () => {
    const songId = localStorage.getItem("songId");
    if (!songId) {
      setShowDialog("save-new-song");
      setMenuOpen(false);
      return;
    }

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not saved.");
      return;
    }

    const songData = {
      song: {
        title: songTitle,
        loops: allLoopSettings,
        samples: allSampleData,
      },
      userId,
    };

    try {
      const result = await axios.put(
        `${BASE_URL}/beats/me/songs/${songId}`,
        songData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (result.status === 201) {
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
        setShowDialog("api-response");
      }
    }
  };

  const handleDeleteSong = async () => {
    const songId = localStorage.getItem("songId");

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not deleted.");
      return;
    }

    try {
      const result = await axios.delete(
        `${BASE_URL}/beats/me/songs/${songId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (result.status === 200) {
        apiResponseMessageRef.current = result.data.message;
        localStorage.removeItem("songTitle");
        localStorage.removeItem("songId");
        setSongId("");
        setSongTitle("");
        setShowDialog("api-response");
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        console.error("Error deleting song from DB:", error);
        apiResponseMessageRef.current = error.response.data.message;
        setShowDialog("api-response");
      }
    }
  };

  const handleDownloadWavStems = async () => {
    await downloadAllWavStems();
    Tone.start();
    setMenuOpen(false);
  };

  useEffect(() => {
    if (showDialog) {
      setHotKeysActive(false);
    } else {
      setHotKeysActive(true);
    }
  }, [showDialog, setHotKeysActive]);

  useEffect(() => {
    if (!token) return;
    const checkLogin = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/auth/check-login`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.data.loggedIn) {
          handleLogout();
          apiResponseMessageRef.current = res.data.message;
          setShowDialog("api-response");
        }
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          handleLogout();
          apiResponseMessageRef.current = error.response.data.message;
          setShowDialog("api-response");
        }
      }
    };
    checkLogin();
    // Only run on mount or when token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.mainMenu} id="main-menu">
      {/* Info Section */}
      {isAuthenticated && (displayName || songTitle) && (
        <div className={styles.info}>
          {displayName && (
            <span
              className={`${styles.infoItem} ${styles.user}`}
              title={displayName}
            >
              {displayName}
            </span>
          )}
          {songTitle && (
            <span
              className={`${styles.infoItem} ${styles.song}`}
              title={songTitle}
            >
              {songTitle}
            </span>
          )}
        </div>
      )}

      <div ref={menuRef}>
        {/* Menu Button */}
        <button
          className={`${styles.menuButton} ${menuOpen ? styles.menuButtonOpen : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
        </button>

        {/* --Menu Options-- */}

        {menuOpen && (
          <div className={styles.menu}>
            <ul>
              {isAuthenticated ? (
                <>
                  <li
                    className={styles.item}
                    onClick={() => {
                      confirmActionRef.current = {
                        message: "Are you sure you want to log out?",
                        buttonText: "See Ya!",
                        action: handleLogout,
                      };
                      setShowDialog("confirm-action");
                      setMenuOpen(false);
                    }}
                  >
                    Log Out
                  </li>
                  <li
                    className={styles.item}
                    onClick={handleSaveSong}
                  >
                    Save Song
                  </li>
                  <li
                    className={styles.item}
                    onClick={() => {
                      setShowDialog("save-new-song");
                      setMenuOpen(false);
                    }}
                  >
                    Save As
                  </li>
                  <li
                    className={styles.item}
                    onClick={() => {
                      confirmActionRef.current = {
                        message: "Are you sure you want to delete this song?",
                        buttonText: "100!",
                        action: handleDeleteSong,
                      };
                      setShowDialog("confirm-action");
                      setMenuOpen(false);
                    }}
                  >
                    Delete Song
                  </li>
                  <li
                    className={styles.item}
                    onClick={() => {
                      setShowDialog("load-song");
                      setMenuOpen(false);
                    }}
                  >
                    Load Song
                  </li>
                </>
              ) : (
                <>
                  <li
                    className={styles.item}
                    onClick={() => {
                      setShowDialog("auth-dialog");
                      setMenuOpen(false);
                    }}
                  >
                    Login
                  </li>
                </>
              )}

              <li className={styles.divider} aria-hidden="true" />
              <li
                className={styles.item}
                onClick={() => {
                  setShowDialog("collection-menu");
                  setMenuOpen(false);
                }}
              >
                Load Collection
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  setShowDialog("kit-menu");
                  setMenuOpen(false);
                }}
              >
                Load Drum Kit
              </li>
              <li
                className={styles.item}
                onClick={handleDownloadWavStems}
              >
                Download Stems
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  confirmActionRef.current = {
                    message:
                      "This action will replace all current samples and reset the sampler to default values. Are you sure?",
                    buttonText: "Fresh Start",
                    action: handleReset,
                  };
                  setShowDialog("confirm-action");
                  setMenuOpen(false);
                }}
              >
                Reset All
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  setShowDialog("about");
                  setMenuOpen(false);
                }}
              >
                About
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  setShowDialog("help-shortcuts");
                  setMenuOpen(false);
                }}
              >
                Help &amp; Shortcuts
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
