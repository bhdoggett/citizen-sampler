"use client";
import { useEffect, useState, useRef } from "react";
import { SampleType } from "../types/SampleType";
import { useAudioContext } from "../contexts/AudioContext";

type DrumPadProps = {
  sample: SampleType;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const { audioContext } = useAudioContext(); // Get the shared AudioContext
  const [sampleStart, setSampleStart] = useState<number>(0);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null); // Store latest source
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Fetch the sample audio buffer
    const loadAudio = async () => {
      try {
        const response = await fetch(sample.audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        setBuffer(audioBuffer);

        // Set random start time for the sample
        const randomStart = Math.random() * (audioBuffer.duration - 1);
        setSampleStart(randomStart);
      } catch (error) {
        console.error("Error loading audio sample:", error);
      }
    };

    loadAudio();
  }, [audioContext, sample.audioUrl]);

  useEffect(() => {
    if (audioContext && !gainNodeRef.current) {
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(1, audioContext.currentTime);
      gainNode.connect(audioContext.destination);
      gainNodeRef.current = gainNode;
    }
  }, []);

  const handlePressPad = () => {
    if (audioContext.state === "suspended") {
      audioContext.resume();
      console.log("AudioContext resumed");
    }

    if (!buffer || !gainNodeRef.current) {
      console.error("Audio buffer or gain node not initialized.");
      return;
    }

    // Create a new AudioBufferSourceNode each time
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNodeRef.current);
    source.start(0, sampleStart); // Play from random start time

    // Save reference so we can stop it
    sourceRef.current = source;
  };

  const handleReleasePad = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect(); // Prevent memory leaks
      sourceRef.current = null; // Clear ref
    }
  };

  return (
    <div>
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className="bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-14 h-14"
      >
        {sample.duration}
      </button>
    </div>
  );
};

export default DrumPad;
