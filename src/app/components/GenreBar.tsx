"use client";
import { useAudioContext } from "../contexts/AudioContext";

const GenreBar = () => {
  const { setGenre } = useAudioContext();

  const handleClick = (genre) => {
    setGenre(genre);
    console.log("Changing genre to:", genre);
  };

  return (
    <div className="my-3">
      <button
        className="border border-slate-600 bg-slate-300 rounded-sm mx-1 w-20 focus:bg-black focus:text-white focus:font-bold"
        onClick={() => handleClick("jazz")}
      >
        Jazz
      </button>
      <button
        className="border border-slate-600 bg-slate-300 rounded-sm mx-1 w-20"
        onClick={() => handleClick("classical")}
      >
        Classical
      </button>
      <button
        className="border border-slate-600 bg-slate-300 rounded-sm mx-1 w-20"
        onClick={() => handleClick("folk-songs")}
      >
        Folk
      </button>
      <button
        className="border border-slate-600 bg-slate-300 rounded-sm mx-1 w-20"
        onClick={() => handleClick("popular")}
      >
        Popular
      </button>
    </div>
  );
};

export default GenreBar;
