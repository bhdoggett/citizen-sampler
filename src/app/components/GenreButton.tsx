const GenreButton = () => {
  const { setQuery } = useAudioContext();

  const handleClick = (query) => {
    setQuery(query);
    console.log("Changing query to:", query);
  };

  const handleBlur = () => {
    
  }
  
  const handleClick = 
  return (
    <>
      <button
        className="border border-slate-600 bg-slate-300 rounded-sm mx-1 w-20 focus:bg-black focus:text-white focus:font-bold"
        onClick={() => handleClick("jazz")}
      >
        Jazz
      </button>
    </>
  );
};

export default GenreButton;
