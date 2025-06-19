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
    setAuthIsSignup,
  } = useAuthContext();
  const {
    confirmActionRef,
    showDialog,
    setShowDialog,
    apiResponseMessageRef,
    setHotKeysActive,
  } = useUIContext();
  const { songTitle, allLoopSettings, allSampleData } = useAudioContext();
  const downloadAllWavStems = useDownloadWavStems();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const logout = (): void => {
    localStorage.removeItem("token");
    router.push("/");
    setToken(null);
    setUserId(null);
    setUsername(null);
    setDisplayName(null);
  };

  const handleSaveSong = async () => {
    const songId = localStorage.getItem("songId");
    if (!songId) {
      setShowDialog("save-new-song");
      setMenuOpen(false);
      return;
    }

    if (!isAuthenticated) {
      console.warn("User not authenticated. Song not saved to DB.");
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
    <div className="relative flex justify-between items-center" id="main-menu">
      {/* Main Header Container */}

      {/* Info Section */}
      {isAuthenticated && (
        <div className="flex justify-between bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-2 border-slate-600 shadow-lg overflow-hidden">
          <div className="flex items-center divide-x divide-slate-500 h-7">
            {displayName && (
              <div className="px-1 py-1 max-w-24 relative group">
                <p
                  className="text-xs font-bold text-white tracking-wide truncate"
                  title={displayName}
                >
                  {displayName}
                </p>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10">
                  {displayName}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              </div>
            )}

            {songTitle && (
              <div className="px-1 py-1 max-w-32 relative group">
                <p
                  className="text-xs font-semibold text-slate-200 truncate"
                  title={songTitle}
                >
                  {songTitle}
                </p>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10">
                  {songTitle}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={menuRef}>
        {/* Menu Button */}
        <button
          className="group relative flex items-center ml-1 justify-center w-8 h-8 bg-slate-600 hover:bg-slate-500 text-white border border-slate-500 hover:border-slate-400 transition-all duration-200 shadow-md hover:shadow-lg "
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Menu"
        >
          <div className="relative w-5 h-4">
            <span
              className={`absolute left-0 h-0.5 w-5 bg-white transform transition-all duration-300 ease-in-out ${
                menuOpen ? "top-2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-0.5 w-5 bg-white  transition-all duration-200 ease-in-out ${
                menuOpen ? "opacity-0 scale-75" : "opacity-100 scale-100"
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 bg-white  transform transition-all duration-300 ease-in-out ${
                menuOpen ? "top-2 -rotate-45" : "top-4"
              }`}
            />
          </div>
        </button>

        {/* --Menu Options-- */}

        {menuOpen && (
          <div className="absolute right-0 top-0 mt-12 bg-white border  shadow-md shadow-slate-500 z-20 min-w-[150px]">
            <ul className="relative flex flex-col main-menu text-sm">
              {isAuthenticated ? (
                <>
                  <li
                    className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                    onClick={() => {
                      confirmActionRef.current = {
                        message: "Are you sure you want to log out?",
                        buttonText: "See Ya!",
                        action: logout,
                      };
                      setShowDialog("confirm-action");
                      setMenuOpen(false);
                    }}
                  >
                    Log Out
                  </li>
                  <li
                    className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                    onClick={handleSaveSong}
                  >
                    Save
                  </li>
                  <li
                    className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                    onClick={() => {
                      setShowDialog("save-new-song");
                      setMenuOpen(false);
                    }}
                  >
                    Save As
                  </li>
                  <li
                    className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
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
                    className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                    onClick={() => {
                      setAuthIsSignup(true);
                      setShowDialog("auth-dialog");
                      setMenuOpen(false);
                    }}
                  >
                    Sign Up
                  </li>
                  <li
                    className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                    onClick={() => {
                      setAuthIsSignup(false);
                      setShowDialog("auth-dialog");
                      setMenuOpen(false);
                    }}
                  >
                    Login
                  </li>
                </>
              )}

              <li
                className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                onClick={() => {
                  setShowDialog("collection-menu");
                  setMenuOpen(false);
                }}
              >
                Load Collection
              </li>
              <li
                className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                onClick={() => {
                  setShowDialog("kit-menu");
                  setMenuOpen(false);
                }}
              >
                Load Drum Kit
              </li>
              <li
                className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                onClick={handleDownloadWavStems}
              >
                Download Stems
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
