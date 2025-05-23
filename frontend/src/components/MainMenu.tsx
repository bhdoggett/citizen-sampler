"use client";
import { useState, useEffect } from "react";
import { useAuthContext } from "../app/contexts/AuthContext";
import { useUIContext } from "../app/contexts/UIContext";

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
  // const [authIsSignup, setAuthIsSignup] = useState<boolean>(false);
  // const confirmActionRef = useRef<ConfirmActionRef>(null);
  const {
    isAuthenticated,
    setToken,
    user,
    setUser,
    setAuthIsSignup,
  } = useAuthContext();
  const { confirmActionRef, showDialog, setShowDialog } = useUIContext();

  const logout = (): void => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (showDialog) {
      setHotKeysActive(false);
    } else {
      setHotKeysActive(true);
    }
  }, [showDialog, setHotKeysActive]);

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
                    confirmActionRef.current = {
                      message: "Are you sure you want to log out?",
                      buttonText: "Log Out",
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
                  onClick={() => {
                    setShowDialog("save-song");
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
                  Sign In
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
          </ul>
        </div>
      )}
    </div>
  );
};

export default Menu;
