"use client";
import { useState, useEffect } from "react";
import * as Tone from "tone";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useAuthContext } from "../app/contexts/AuthContext";
import { useAudioContext } from "../app/contexts/AudioContext";
import { useUIContext } from "../app/contexts/UIContext";
import useDownloadWavStems from "../app/hooks/useDownloadWavStems";
dotenv.config();
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type MenuProps = {
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

export type ConfirmActionRef = {
  message: string;
  buttonText: string;
  action: () => void;
} | null;

const Menu: React.FC<MenuProps> = ({ setHotKeysActive }) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const {
    isAuthenticated,
    token,
    setToken,
    username,
    setUsername,
    setAuthIsSignup,
  } = useAuthContext();
  const { confirmActionRef, showDialog, setShowDialog, apiResponseMessageRef } =
    useUIContext();
  const { songTitle, allLoopSettings, allSampleData } = useAudioContext();
  const downloadWavStems = useDownloadWavStems();

  const logout = (): void => {
    localStorage.removeItem("token");
    setToken(null);
    setUsername(null);
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
      username: username,
    };

    console.log("songData", songData);

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
        console.log("Song saved to DB:", result.data);
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
    downloadWavStems();
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
    console.log("username:", username);
  }, [username]);

  return (
    <div className="relative flex flex-col items-end" id="main-menu">
      {username && <p className="text-xs font-bold w-full pb-1">{username}</p>}

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
        <div className="absolute right-0 mt-12 bg-white border rounded-sm shadow-lg z-10 min-w-[150px]">
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
                {/* <li
                  className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                  onClick={async () => {
                    await saveSong();
                    setShowDialog("api-response");
                    setMenuOpen(false);
                  }}
                >
                  Save
                </li> */}
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
                    setShowDialog("auth-dialogue");
                    setMenuOpen(false);
                  }}
                >
                  Sign Up
                </li>
                <li
                  className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                  onClick={() => {
                    setAuthIsSignup(false);
                    setShowDialog("auth-dialogue");
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
              Load from Collection
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
