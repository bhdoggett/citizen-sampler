"use client";
import { useEffect, useRef, useState } from "react";
import { SampleType } from "../types/SampleType";
import { useAudioContext } from "../contexts/AudioContext";
import * as Tone from "tone";
import { Subdivision, TransportTime } from "tone/build/esm/core/type/Units";

type DrumPadProps = {
  sample: SampleType;
};

type SamplePosition = {
  id: string;
  startTime: TransportTime;
  releaseTime?: TransportTime;
  duration?: Subdivision;
};

const DrumPad: React.FC<DrumPadProps> = ({ sample }) => {
  const {
    masterGain,
    isRecording,
    isPlaying,
    quantizeRecordActive,
    quantizeSetting,
  } = useAudioContext();
  const sampler = useRef<Tone.Sampler | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [samplePositions, setSamplePositions] = useState<SamplePosition[]>([]);

  useEffect(() => {
    if (!sample.audioUrl) return;

    sampler.current = new Tone.Sampler({
      urls: { C4: sample.audioUrl },
      attack: 0.1, // Adjust the attack time (default is 0.1)
      release: 0.1, // Adjust the release time (default is 0.5)
      onload: () => setIsLoaded(true),
      onerror: (error) => {
        console.error("Error loading sample:", error);
        setIsLoaded(false);
      },
    }).connect(masterGain);

    return () => {
      sampler.current?.dispose();
      console.log("Sampler disposed");
    };
  }, [sample]);

  const handlePressPad = () => {
    if (!isLoaded || !sampler.current) {
      console.warn("Sample not loaded yet!");
      return;
    }

    const startTime = Tone.Transport.position;
    console.log("Start Position:", startTime);

    sampler.current.triggerAttack("C4");

    if (isRecording) {
      setSamplePositions((prevPositions) => [
        ...prevPositions,
        { id: sample.id, startTime },
      ]);
    }
  };

  const handleReleasePad = () => {
    if (!isLoaded || !sampler.current) return;

    let releaseTime = Tone.Transport.position;
    const loopEnd = Tone.Transport.loopEnd
      ? Tone.Time(Tone.Transport.loopEnd).toSeconds()
      : 0;
    const startTimeInSeconds = Tone.Time(
      samplePositions.at(-1)?.startTime || 0
    ).toSeconds();
    const releaseTimeInSeconds = Tone.Time(releaseTime).toSeconds();

    // Adjust for loop boundary
    if (releaseTimeInSeconds < startTimeInSeconds) {
      releaseTime = Tone.Time(
        releaseTimeInSeconds + loopEnd
      ).toBarsBeatsSixteenths();
      console.log("Adjusted Release Position (Looped):", releaseTime);
    } else {
      console.log("Release Position:", releaseTime);
    }

    sampler.current.triggerRelease("C4");

    if (isRecording) {
      setSamplePositions((prevPositions) =>
        prevPositions.map((pos) => {
          if (pos.id === sample.id && !pos.duration) {
            const duration = Tone.Time(releaseTime).toNotation();
            return { ...pos, releaseTime, duration };
          }
          return pos;
        })
      );
    }
  };

  useEffect(() => {
    if (isPlaying) {
      samplePositions.forEach(({ startTime, duration }) => {
        if (duration) {
          Tone.Transport.schedule((time) => {
            sampler.current?.triggerAttackRelease("C4", duration, time);
          }, startTime);
        }
      });
    }
  }, [isPlaying, samplePositions]);

  useEffect(() => {
    if (!isPlaying && sampler.current) {
      sampler.current.triggerRelease("C4");
    }
  }, [isPlaying]);

  return (
    <div>
      <button
        onMouseDown={handlePressPad}
        onTouchStart={handlePressPad}
        onMouseUp={handleReleasePad}
        onTouchEnd={handleReleasePad}
        className="bg-slate-400 border border-slate-800 rounded-sm focus:border-double w-14 h-14 active:bg-slate-500"
        disabled={!isLoaded}
      >
        {isLoaded ? sample.label : "Loading..."}
      </button>
    </div>
  );
};

export default DrumPad;
