const GenreButton = ({ genre }) => {
  const { setGenre } = useAudioContext();

  const handleClick = () => {
    setGenre(genre);
    console.log("Changing query to:", query);
  };

  const handleBlur = () => {};
  return (
    <>
      <button
        className="border border-slate-600 bg-slate-300 rounded-sm mx-1 w-20 focus:bg-black focus:text-white focus:font-bold"
        onClick={() => handleClick}
      >
        Jazz
      </button>
    </>
  );
};

export default GenreButton;
