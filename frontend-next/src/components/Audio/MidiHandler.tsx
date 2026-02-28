"use client";
import { useMidiContext } from "../../app/contexts/MidiContext";

export default function MidiHandler() {
  const { midiConnected, midiDevices } = useMidiContext();

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          midiConnected ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      <span>{midiConnected ? midiDevices[0] : "No MIDI"}</span>
    </div>
  );
}
