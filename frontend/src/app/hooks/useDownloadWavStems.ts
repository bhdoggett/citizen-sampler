// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import quantize from "../functions/quantize";
import toWav from "audiobuffer-to-wav";
import type { LoopName } from "../../../../shared/types/audioTypes";

const useDownloadWavStems = () => {
  const { allSampleData, samplersRef, allLoopSettings, makeSampler } =
    useAudioContext();
  const allIds = Object.keys(samplersRef.current);
  const loops = ["A", "B", "C", "D"];

  // Function to get Audio Buffer for a given sampler's loop recording
  const getAudioBuffer = async (id: string, loop: LoopName) => {
    const loopEnd = Tone.getTransport().loopEnd;
    const loopDuration = Tone.Time(loopEnd).toSeconds();
    const sampleData = allSampleData[id];
    const { settings } = sampleData;
    const events = sampleData.events[loop];

    if (events.length === 0) return null;

    // Find max end time for this sample
    let maxEndTime = 0;
    for (const event of events) {
      if (event.startTime !== null && event.duration !== null) {
        const eventStart = Tone.Ticks(event.startTime).toSeconds();
        const quantizedStart = settings.quantize
          ? quantize(eventStart, settings.quantVal)
          : eventStart;
        const eventEnd = quantizedStart + event.duration;
        if (eventEnd > maxEndTime) {
          maxEndTime = eventEnd;
        }
      }
    }

    const renderDuration = Math.max(loopDuration, maxEndTime);

    const toneBuffer = await Tone.Offline(async ({ transport }) => {
      // Set tempo and loop settings per loop
      const loopSettings = allLoopSettings.current[loop];
      if (!loopSettings) return;
      transport.bpm.value = loopSettings.bpm;
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = `${loopSettings.bars}m`;

      const offlineSamplerWithFx = await makeSampler(
        id,
        allSampleData[id].url,
        true
      );

      const { sampler } = offlineSamplerWithFx;

      const toneEvents = events
        .filter((event) => event.startTime !== null)
        .map((event) => {
          if (!event.startTime) return;
          const startTimeInSeconds = Tone.Ticks(event.startTime).toSeconds();
          const eventTime = settings.quantize
            ? quantize(startTimeInSeconds, settings.quantVal)
            : startTimeInSeconds;
          // console.log(`event at index: ${idx}`, event);
          return [
            eventTime,
            {
              startTime: eventTime,
              duration: event.duration,
              note: event.note,
              // velocity: event.velocity,
            },
          ];
        });

      const part = new Tone.Part((time, event) => {
        const { start, end } = settings;
        if (
          typeof event === "object" &&
          event !== null &&
          "duration" in event &&
          event.duration !== null
        ) {
          const actualDuration = end
            ? end - start < event.duration
              ? end - start
              : event.duration
            : event.duration;
          sampler.triggerAttackRelease(event.note, actualDuration, time, start);

          setTimeout(() => {}, event.duration * 1000);
          console.log(event);
        }
      }, toneEvents);

      part.start(0);
      transport.start();
    }, renderDuration);

    return toneBuffer;
  };

  // Translate audio buffer into a downloadable wave file
  const translateBufferToWavUrl = async (toneBuffer: Tone.ToneAudioBuffer) => {
    const wavData = toWav(toneBuffer);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    return url;
  };

  // Download a given sampler's Wav file
  const downloadWav = async (id: string, loop: LoopName) => {
    const toneBuffer = await getAudioBuffer(id, loop as LoopName);
    if (!toneBuffer) {
      console.warn(`No audio buffer generated for ID ${id} at loop ${loop}`);
      return;
    }

    const wavUrl = translateBufferToWavUrl(toneBuffer as Tone.ToneAudioBuffer);
    if (!wavUrl) {
      console.warn(`No WAV URL generated for for ID ${id} at loop ${loop}`);
      return;
    }
    const link = document.createElement("a");

    link.href = await wavUrl;
    link.download = `${id}-${loop}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all wav files - grouped in one function for button click
  const downloadAllWavs = () => {
    allIds.forEach((id) => {
      loops.forEach((loop) => {
        downloadWav(id, loop as LoopName);
      });
    });
    Tone.start();
  };

  return downloadAllWavs;
};

export default useDownloadWavStems;
