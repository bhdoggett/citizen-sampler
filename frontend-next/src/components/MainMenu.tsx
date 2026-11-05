"use client";
import { useState, useEffect, useRef } from "react";
import { useSongStore } from "src/lib/song/react";
import { useHostContext } from "src/lib/engine/react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../app/contexts/AuthContext";
import { useAudioContext } from "../app/contexts/AudioContext";
import { useUIContext } from "../app/contexts/UIContext";
import useDownloadWavStems from "../app/hooks/useDownloadWavStems";
import { defaultLoopSettings } from "src/lib/audio/defaults";
import {
  GENERIC_ERROR_MESSAGE,
  apiErrorMessage,
  checkLogin,
  deleteSong,
  isAuthRejection,
  updateSong,
} from "src/lib/api/client";
import styles from "./MainMenu.module.css";

const Menu: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const {
    isAuthenticated,
    token,
    userId,
    displayName,
    logout,
    setError,
  } = useAuthContext();
  const { openDialog } = useUIContext();
  const {
    songTitle,
    setAllLoopSettings,
    setCurrentLoop,
    setSongTitle,
    songId,
    setSongId,
    initLocSamplesFromAllCollections,
    initKitSamples,
    setAllSampleData,
  } = useAudioContext();
  const downloadAllWavStems = useDownloadWavStems();
  const store = useSongStore();
  const { isPlugin } = useHostContext();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push("/");
    if (setError) setError("Session expired. Please log in again.");
  };

  const handleReset = () => {
    setAllLoopSettings(defaultLoopSettings());
    setCurrentLoop("A");
    const locSamples = initLocSamplesFromAllCollections();
    const kitSamples = initKitSamples("mpc");
    setAllSampleData({ ...locSamples, ...kitSamples });
  };

  const handleSaveSong = async () => {
    // A song with no id has never been saved, so ask for a title first
    if (!songId) {
      openDialog({ type: "save-new-song" });
      setMenuOpen(false);
      return;
    }

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not saved.");
      return;
    }

    const { samples, loops } = store.getState();
    const songData = {
      song: {
        title: songTitle,
        loops,
        samples,
      },
      userId,
    };

    try {
      const result = await updateSong(token, songId, songData);
      openDialog({ type: "api-response", message: result.message });
    } catch (err) {
      console.error("Error saving song to DB:", err);
      openDialog({
        type: "api-response",
        message: apiErrorMessage(err, GENERIC_ERROR_MESSAGE),
      });
    }
  };

  const handleDeleteSong = async () => {
    if (!songId) return;

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not deleted.");
      return;
    }

    try {
      const result = await deleteSong(token, songId);
      setSongId("");
      setSongTitle("");
      openDialog({ type: "api-response", message: result.message });
    } catch (err) {
      console.error("Error deleting song from DB:", err);
      openDialog({
        type: "api-response",
        message: apiErrorMessage(err, GENERIC_ERROR_MESSAGE),
      });
    }
  };

  const handleDownloadWavStems = async () => {
    await downloadAllWavStems();
    setMenuOpen(false);
  };

  useEffect(() => {
    // Accounts do not exist inside the plugin
    if (!token || isPlugin) return;
    // Only a rejected token logs the user out. An outage leaves the session
    // alone.
    const verifyLogin = async () => {
      try {
        const result = await checkLogin(token);
        if (!result.loggedIn) {
          handleLogout();
          openDialog({
            type: "api-response",
            message: result.message ?? "Please log in again.",
          });
        }
      } catch (err) {
        if (!isAuthRejection(err)) return;
        handleLogout();
        openDialog({
          type: "api-response",
          message: apiErrorMessage(err, "Please log in again."),
        });
      }
    };
    verifyLogin();
    // Only run on mount or when token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isPlugin]);

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
              {isPlugin ? null : isAuthenticated ? (
                <>
                  <li
                    className={styles.item}
                    onClick={() => {
                      openDialog({
                        type: "confirm-action",
                        message: "Are you sure you want to log out?",
                        buttonText: "See Ya!",
                        onConfirm: handleLogout,
                      });
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
                      openDialog({ type: "save-new-song" });
                      setMenuOpen(false);
                    }}
                  >
                    Save As
                  </li>
                  <li
                    className={styles.item}
                    onClick={() => {
                      openDialog({
                        type: "confirm-action",
                        message: "Are you sure you want to delete this song?",
                        buttonText: "100!",
                        onConfirm: handleDeleteSong,
                      });
                      setMenuOpen(false);
                    }}
                  >
                    Delete Song
                  </li>
                  <li
                    className={styles.item}
                    onClick={() => {
                      openDialog({ type: "load-song" });
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
                      openDialog({ type: "auth-dialog" });
                      setMenuOpen(false);
                    }}
                  >
                    Login
                  </li>
                </>
              )}

              {!isPlugin && <li className={styles.divider} aria-hidden="true" />}
              <li
                className={styles.item}
                onClick={() => {
                  openDialog({ type: "collection-menu" });
                  setMenuOpen(false);
                }}
              >
                Load Collection
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  openDialog({ type: "kit-menu" });
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
                  openDialog({
                    type: "confirm-action",
                    message:
                      "This action will replace all current samples and reset the sampler to default values. Are you sure?",
                    buttonText: "Fresh Start",
                    onConfirm: handleReset,
                  });
                  setMenuOpen(false);
                }}
              >
                Reset All
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  openDialog({ type: "about" });
                  setMenuOpen(false);
                }}
              >
                About
              </li>
              <li
                className={styles.item}
                onClick={() => {
                  openDialog({ type: "help-shortcuts" });
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
