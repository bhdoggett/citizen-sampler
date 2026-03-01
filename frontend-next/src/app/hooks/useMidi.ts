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

  // Synchronous assignment (not useEffect) so MIDI events that fire between a
  // render and its effects always see the latest selectedSampleId/baseNote etc.
  callbacksRef.current = callbacks;

  // Tracks the timestamp of the most recent note-on per note name.
  // Used to deduplicate note-ons that arrive within a short window — common
  // when a MIDI controller exposes multiple ports (e.g. "MIDI In" + "MIDI Through")
  // and both fire for the same physical key press.
  const recentNoteOnsRef = useRef<Map<string, number>>(new Map());

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
          const noteName = Frequency(midiNote, "midi").toNote();
          // Skip duplicate note-ons for the same note within 15 ms
          const now = performance.now();
          const last = recentNoteOnsRef.current.get(noteName) ?? -Infinity;
          if (now - last < 15) return;
          recentNoteOnsRef.current.set(noteName, now);

          const normalizedVelocity = velocity / 127;
          callbacksRef.current.onNoteOn(noteName, normalizedVelocity);
        } else if (isNoteOff) {
          const noteName = Frequency(midiNote, "midi").toNote();
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
