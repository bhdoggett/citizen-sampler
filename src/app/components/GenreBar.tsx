"use client";
import { useAudioContext } from "../contexts/AudioContext";

const GenreBar = () => {
  const { genre, setGenre } = useAudioContext();

  const handleClick = (genre) => {
    setGenre(genre);
  };

  return (
    <div className="my-3">
      <button
        className={`rounded-sm mx-1 w-20 border  border-slate-600 ${genre === "jazz" ? "border-slate600 bg-black text-white font-bold" : "bg-slate-300"} `}
        onClick={() => handleClick("jazz")}
      >
        Jazz
      </button>
      <button
        className={`rounded-sm mx-1 w-20 border  border-slate-600 ${genre === "classical" ? "border-slate600 bg-black text-white font-bold" : "bg-slate-300"} `}
        onClick={() => handleClick("classical")}
      >
        Classical
      </button>
      <button
        className={`rounded-sm mx-1 w-20 border  border-slate-600 ${genre === "folk-songs" ? "border-slate600 bg-black text-white font-bold" : "bg-slate-300"} `}
        onClick={() => handleClick("folk-songs")}
      >
        Folk
      </button>
      <button
        className={`rounded-sm mx-1 w-20 border  border-slate-600 ${genre === "popular" ? "border-slate600 bg-black text-white font-bold" : "bg-slate-300"} `}
        onClick={() => handleClick("popular")}
      >
        Popular
      </button>
    </div>
  );
};

export default GenreBar;
