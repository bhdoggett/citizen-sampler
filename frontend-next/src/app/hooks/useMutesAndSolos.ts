"use client";
import { useSongStore } from "src/lib/song/react";

// Mute and solo are mutually exclusive: turning one on turns the other off
const useMutesAndSolos = () => {
  const store = useSongStore();

  const setSampleSolo = (id: string, value: boolean) => {
    store.setPadSettings(id, { solo: value, ...(value && { mute: false }) });
  };

  const setSampleMute = (id: string, value: boolean) => {
    store.setPadSettings(id, { mute: value, ...(value && { solo: false }) });
  };

  // remove solo from all samples
  const clearSolos = () => {
    Object.keys(store.getState().samples).forEach((id) => {
      setSampleSolo(id, false);
    });
  };

  return {
    setSampleMute,
    setSampleSolo,
    clearSolos,
  };
};

export default useMutesAndSolos;
