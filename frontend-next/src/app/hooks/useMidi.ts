import { useEffect, useRef, useState, useCallback } from "react";
import { Frequency } from "tone";

type MidiCallbacks = {
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
};

type UseMidiReturn = {
  isConnected: boolean;
  inputDevices: string[];
};

export function useMidi(callbacks: MidiCallbacks): UseMidiReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [inputDevices, setInputDevices] = useState<string[]>([]);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated on each render to avoid stale closures
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const attachListeners = useCallback((midiAccess: MIDIAccess) => {
    const devices: string[] = [];

    midiAccess.inputs.forEach((input) => {
      input.onmidimessage = (event: MIDIMessageEvent) => {
        const data = event.data;
        if (!data || data.length < 3) return;

        const status = data[0];
        const midiNote = data[1];
        const velocity = data[2];

        const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
        const isNoteOff =
          (status & 0xf0) === 0x80 ||
          ((status & 0xf0) === 0x90 && velocity === 0);

        if (isNoteOn) {
          const noteName = new Frequency(midiNote, "midi").toNote();
          const normalizedVelocity = velocity / 127;
          callbacksRef.current.onNoteOn(noteName, normalizedVelocity);
        } else if (isNoteOff) {
          const noteName = new Frequency(midiNote, "midi").toNote();
          callbacksRef.current.onNoteOff(noteName);
        }
      };

      if (input.name) {
        devices.push(input.name);
      }
    });

    setInputDevices(devices);
    setIsConnected(devices.length > 0);
  }, []);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported in this browser.");
      return;
    }

    let midiAccess: MIDIAccess | null = null;

    navigator
      .requestMIDIAccess()
      .then((access) => {
        midiAccess = access;
        attachListeners(access);
        access.onstatechange = () => {
          attachListeners(access);
        };
      })
      .catch((err) => {
        console.error("Failed to get MIDI access:", err);
      });

    return () => {
      if (midiAccess) {
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [attachListeners]);

  return { isConnected, inputDevices };
}
