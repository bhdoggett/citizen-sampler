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
    <div className="relative flex flex-col items-end" id="main-menu">
      {displayName && (
        <p className="text-xs font-bold w-full pb-1">{displayName}</p>
      )}

      {/* --Menu Button-- */}
      <button
        className="absolute top-4 flex items-center justify-center w-8 h-8 bg-slate-500 text-white border border-slate-700 hover:bg-slate-700 transition-colors"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Menu"
      >
        <span
          className={`absolute h-0.5 w-5 bg-white transform transition-transform duration-200 ease-in-out ${
            menuOpen ? "rotate-45" : "-translate-y-1.5"
          }`}
        />
        <span
          className={`absolute h-0.5 w-5 bg-white transition-all duration-100 ease-in-out ${
            menuOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`absolute h-0.5 w-5 bg-white transform transition-transform duration-200 ease-in-out ${
            menuOpen ? "-rotate-45" : "translate-y-1.5"
          }`}
        />
      </button>

      {/* --Menu Options-- */}

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-12 bg-white border rounded-sm shadow-lg z-10 min-w-[150px]"
        >
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
  );
};

export default Menu;
