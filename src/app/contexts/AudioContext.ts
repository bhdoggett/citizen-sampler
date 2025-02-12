import { createContext, useContext, useEffect, useState } from "react";

const AudioContextContext = createContext(null);

export const AudioProvider = ({children}) => {
  const [audioContext, setAudioContext] = useState(null)

  useEffect(() => {
    const context = new (window.AudioContext || window.webkitAudioContext)()

    setAudioContext(context);

    return () => context.close()
  }, []);

  return (
    <AudioContextContext.Provider value={audioContext}>
      {children}
    </AudioContextContext.Provider>
  );
}

export const useAudioContext = () => {
  return useContext(AudioContextContext)
}