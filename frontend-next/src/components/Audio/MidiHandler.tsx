"use client";
import { useMidiContext } from "../../app/contexts/MidiContext";
import styles from "./MidiHandler.module.css";

export default function MidiHandler() {
  const { midiConnected, midiDevices } = useMidiContext();

  return (
    <div className={`${styles.status} ${midiConnected ? styles.connected : ""}`}>
      <span className={styles.led} />
      <span>{midiConnected ? midiDevices[0] : "No MIDI"}</span>
    </div>
  );
}
