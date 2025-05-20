"use client";
import { useState, useEffect } from "react";
import SaveNewSong from "./SaveNewSong";
import CollectionMenu from "./CollectionMenu";

type MenuProps = {
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const Menu: React.FC<MenuProps> = ({ setHotKeysActive }) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [showDialogue, setShowDialogue] = useState<string | null>(null);

  useEffect(() => {
    if (showDialogue) {
      setHotKeysActive(false);
    } else {
      setHotKeysActive(true);
    }
  }, [showDialogue, setHotKeysActive]);

  return (
    <div className="" id="main-menu">
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
              onClick={() => {
                setShowDialogue("save-song");
                setMenuOpen(false);
              }}
            >
              Save Song
            </li>
            <li
              className="px-1 py-1 hover:bg-slate-100 cursor-pointer"
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

      {showDialogue && (
        <div className="absolute left-1/2 transform -translate-x-1/2 top-6 z-30 w-[650px] rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5">
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
        </div>
      )}
    </div>
  );
};

export default Menu;
