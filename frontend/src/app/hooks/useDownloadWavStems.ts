// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import quantize from "../../lib/audio/util/quantize";
import getScheduleEvents from "../../lib/audio/util/getScheduleEvents";
import toWav from "audiobuffer-to-wav";
import type { LoopName } from "../../../../shared/types/audioTypes";

const useDownloadWavStems = () => {
  const {
    allSampleData,
    samplersRef,
    allLoopSettings,
    makeSamplerWithFX,
    applySamplerSettings,
    songTitle,
  } = useAudioContext();
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

    // Format schedule events for Tone.Part
    const scheduleEvents = getScheduleEvents(allSampleData, id, loop);

    // Find max end time of the rendered audio based on duration of scheduled events
    let maxEndTime = 0;

    for (const event of scheduleEvents) {
      if (event[1].startTime !== null && event[1].duration !== null) {
        const eventStart = Tone.Ticks(event[1].startTime).toSeconds();
        const quantizedStart = settings.quantize
          ? quantize(eventStart, settings.quantVal as number)
          : eventStart;
        const eventEnd = quantizedStart + event[1].duration;
        if (eventEnd > maxEndTime) {
          maxEndTime = eventEnd;
        }
      }
    }

    const renderDuration = Math.max(loopDuration, maxEndTime);

    const toneBuffer = await Tone.Offline(async ({ transport }) => {
      // Set tempo and loop settings per loop
      const loopSettings = allLoopSettings[loop];
      if (!loopSettings) return;
      transport.bpm.value = loopSettings.bpm;
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = `${loopSettings.bars}m`;

      const offlineSamplerWithFx = await makeSamplerWithFX(
        id,
        allSampleData[id].url,
        true
      );

      applySamplerSettings(sampleData, offlineSamplerWithFx);

      const { sampler } = offlineSamplerWithFx;

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
          sampler.triggerAttackRelease(
            event.note,
            actualDuration,
            time,
            start,
            event.velocity
          );
        }
      }, scheduleEvents);

      part.start(0);

      transport.start();
    }, renderDuration);

    return toneBuffer;
  };

  // Translate audio buffer into a downloadable wave file
  const translateBufferToWavUrl = async (toneBuffer: Tone.ToneAudioBuffer) => {
    const wavData = await toWav(toneBuffer);
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

    const wavUrl = await translateBufferToWavUrl(
      toneBuffer as Tone.ToneAudioBuffer
    );
    if (!wavUrl) {
      console.warn(`No WAV URL generated for for ID ${id} at loop ${loop}`);
      return;
    }
    const link = document.createElement("a");

    link.href = wavUrl;
    link.download = `${songTitle}-${id.split("-")[1]}-${loop}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all wav files - grouped in one function for button click
  // const downloadAllWavs = async () => {
  //   const downloadPromises = allIds.flatMap((id) =>
  //     loops.flatMap((loop) => downloadWav(id, loop as LoopName))
  //   );
  //   await Promise.all(downloadPromises);
  //   Tone.start();
  // };
  const downloadAllWavs = async () => {
    // Process each ID one at a time
    for (const id of allIds) {
      // Process each loop one at a time for this ID
      for (const loop of loops) {
        try {
          await downloadWav(id, loop as LoopName);
          // Optional: add a small delay between renders
          // await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to download ${id}-${loop}:`, error);
        }
      }
    }
    Tone.start();
  };

  return downloadAllWavs;
};

export default useDownloadWavStems;
