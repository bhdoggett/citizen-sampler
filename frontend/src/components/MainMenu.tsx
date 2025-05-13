"use client";
import { useState, useEffect } from "react";
import { useAudioContext } from "@/app/contexts/AudioContext";

const Menu = () => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const { songTitle, setSongTitle } = useAudioContext();

  useEffect(() => {
    console.log("song Title", songTitle);
  }, [songTitle]);

  return (
    <div
      className=""
      id="main-menu"
      onBlur={(e) => {
        if (e.target.id === "main-menu") return;
        setMenuOpen(false);
      }}
    >
      <button
        className="bg-slate-500 text-white border border-slate-700 px-1 py-1 rounded-sm  hover:bg-slate-600"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        Menu
      </button>

      {menuOpen && (
        <div className="absolute mt-1 bg-white border rounded-sm shadow-lg z-10">
          <ul className="main-menu flex flex-col text-sm">
            <li
              className="px-1 py-1 hover:bg-slate-100 cursor-pointer"
              onClick={() => setSongTitle("Title!!")}
            >
              Save Song
            </li>
            <li
              className="px-1 py-1 hover:bg-slate-100 cursor-pointer"
              onClick={() => setSongTitle("Title!!")}
            >
              Load Song
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Menu;
