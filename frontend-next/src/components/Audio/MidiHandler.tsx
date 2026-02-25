"use client";
import { useRef, useEffect } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import { useMidi } from "../../app/hooks/useMidi";
import { SampleEventFE } from "src/types/audioTypesFE";

export default function MidiHandler() {
  const {
    selectedSampleId,
    allSampleData,
    setAllSampleData,
    samplersRef,
    loopIsPlaying,
    isRecording,
    currentLoop,
  } = useAudioContext();

  // Tracks active (held) notes for polyphonic recording; keyed by note name
  const activeNotesRef = useRef<Map<string, SampleEventFE>>(new Map());

  // Clear active notes when the selected sample changes
  useEffect(() => {
    activeNotesRef.current.clear();
  }, [selectedSampleId]);

  const onNoteOn = (note: string, velocity: number) => {
    const samplerWithFX = samplersRef.current[selectedSampleId];
    if (!samplerWithFX) return;

    const { sampler } = samplerWithFX;
    const { start } = allSampleData[selectedSampleId].settings;
    sampler.triggerAttack(note, Tone.now(), start, velocity);

    if (loopIsPlaying && isRecording) {
      activeNotesRef.current.set(note, {
        startTime: Tone.getTransport().ticks,
        duration: 0,
        note,
        velocity,
      });
    }
  };

  const onNoteOff = (note: string) => {
    const samplerWithFX = samplersRef.current[selectedSampleId];
    if (!samplerWithFX) return;

    const { sampler } = samplerWithFX;
    sampler.triggerRelease(note, Tone.now());

    const activeNote = activeNotesRef.current.get(note);
    if (!activeNote?.startTime || !isRecording) return;

    const releaseTime = Tone.getTransport().seconds;
    const sampleEnd = allSampleData[selectedSampleId].settings.end;

    const actualReleaseTime = sampleEnd
      ? releaseTime < sampleEnd
        ? releaseTime
        : sampleEnd
      : releaseTime;

    const startTimeInSeconds = Tone.Ticks(activeNote.startTime).toSeconds();
    const loopEndInSeconds = Tone.Time(
      Tone.getTransport().loopEnd
    ).toSeconds();

    const duration =
      actualReleaseTime > startTimeInSeconds
        ? actualReleaseTime - startTimeInSeconds
        : loopEndInSeconds - startTimeInSeconds + actualReleaseTime;

    const completedEvent: SampleEventFE = {
      ...activeNote,
      duration,
    };

    setAllSampleData((prev) => ({
      ...prev,
      [selectedSampleId]: {
        ...prev[selectedSampleId],
        events: {
          ...prev[selectedSampleId].events,
          [currentLoop]: [
            ...(prev[selectedSampleId].events[currentLoop] || []),
            completedEvent,
          ],
        },
      },
    }));

    activeNotesRef.current.delete(note);
  };

  const { isConnected, inputDevices } = useMidi({ onNoteOn, onNoteOff });

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      <span>{isConnected ? inputDevices[0] : "No MIDI"}</span>
    </div>
  );
}
