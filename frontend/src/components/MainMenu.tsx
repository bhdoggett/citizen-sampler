"use client";
import { useState, useEffect, useRef } from "react";
import SaveNewSong from "./SaveNewSong";
import CollectionMenu from "./CollectionMenu";
import AuthDialog from "./AuthDialog";
import { useAuthContext } from "../app/contexts/AuthContext";
import ConfirmActionDialog from "./ConfirmActionDialog";

type MenuProps = {
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

export type ConfirmAction = {
  message: string;
  buttonText: string;
  action: () => void;
} | null;

const Menu: React.FC<MenuProps> = ({ setHotKeysActive }) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [showDialogue, setShowDialogue] = useState<string | null>(null);
  const [authIsSignup, setAuthIsSignup] = useState<boolean>(false);
  const confirmAction = useRef<ConfirmAction>(null);
  const { isAuthenticated, setToken, user, setUser } = useAuthContext();

  const logout = (): void => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (showDialogue) {
      setHotKeysActive(false);
    } else {
      setHotKeysActive(true);
    }
  }, [showDialogue, setHotKeysActive]);

  useEffect(() => {
    console.log("user:", user);
  }, [user]);

  return (
    <div className="relative flex flex-col items-end" id="main-menu">
      {user && <p className="text-xs font-bold w-full pb-1">{user}</p>}

      {/* --Menu Button-- */}

      <button
        className="absolute top-4 flex items-center justify-center w-8 h-8 bg-slate-500 text-white border border-slate-700 rounded-sm hover:bg-slate-600 transition-colors"
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
                    confirmAction.current = {
                      message: "Are you sure you want to log out?",
                      buttonText: "Log Out",
                      action: logout,
                    };
                    setShowDialogue("confirm-action");
                    setMenuOpen(false);
                  }}
                >
                  Log Out
                </li>
                <li
                  className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                  onClick={() => {
                    setShowDialogue("save-song");
                    setMenuOpen(false);
                  }}
                >
                  Save Song
                </li>
              </>
            ) : (
              <>
                <li
                  className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                  onClick={() => {
                    setAuthIsSignup(true);
                    setShowDialogue("auth-dialogue");
                    setMenuOpen(false);
                  }}
                >
                  Sign Up
                </li>
                <li
                  className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
                  onClick={() => {
                    setAuthIsSignup(false);
                    setShowDialogue("auth-dialogue");
                    setMenuOpen(false);
                  }}
                >
                  Sign In
                </li>
              </>
            )}

            <li
              className="px-1 py-1 hover:bg-slate-100 cursor-pointer text-right whitespace-nowrap"
              onClick={() => {
                setShowDialogue("collection-menu");
                setMenuOpen(false);
              }}
            >
              Load from Collection
            </li>
          </ul>
        </div>
      )}

      {/* --Menu Dialogues-- */}

      {showDialogue && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          {/* BACKDROP */}
          <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-30" />
          <div className="absolute left-1/2 transform -translate-x-1/2 top-28 z-30 w-[650px] rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5">
            {showDialogue === "save-song" && (
              <SaveNewSong
                setShowDialogue={setShowDialogue}
                setHotKeysActive={setHotKeysActive}
              />
            )}
            {showDialogue === "collection-menu" && (
              <CollectionMenu
                setShowDialogue={setShowDialogue}
                setHotKeysActive={setHotKeysActive}
              />
            )}
            {showDialogue === "auth-dialogue" && (
              <AuthDialog
                setShowDialogue={setShowDialogue}
                setHotKeysActive={setHotKeysActive}
                authIsSignup={authIsSignup}
                setAuthIsSignup={setAuthIsSignup}
              />
            )}
            {showDialogue === "confirm-action" && (
              <ConfirmActionDialog
                confirmAction={confirmAction}
                setShowDialogue={setShowDialogue}
                setHotKeysActive={setHotKeysActive}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
