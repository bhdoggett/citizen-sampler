// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import getScheduleEvents from "../../lib/audio/util/getScheduleEvents";
import { calcPlaybackRate } from "../../lib/audio/util/calcPlaybackRate";
import { calcRenderDuration } from "../../lib/audio/util/calcRenderDuration";
import toWav from "audiobuffer-to-wav";
import type { LoopName } from "../../types/audioTypes";

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
    const loopSettings = allLoopSettings[loop];
    const sampleData = allSampleData[id];
    const { settings } = sampleData;
    const events = sampleData.events[loop];

    if (!loopSettings || events.length === 0) return null;

    // Use this loop's own tempo and length, not whichever loop is live
    const { bpm, beats, bars, swing } = loopSettings;
    const loopDuration = bars * beats * (60 / bpm);

    // Format schedule events for Tone.Part
    const scheduleEvents = getScheduleEvents(allSampleData, id, loop, {
      bpm,
      beats,
      bars,
    });

    // Render the full loop, plus any tail from events that ring past its end
    const renderDuration = calcRenderDuration(scheduleEvents, loopDuration);

    const toneBuffer = await Tone.Offline(async ({ transport }) => {
      // Match the live transport setup for this loop
      transport.bpm.value = bpm;
      transport.swing = swing;
      transport.timeSignature = beats;
      transport.loop = true;
      transport.loopStart = "0:0:0";
      transport.loopEnd = `${bars}:0:0`;

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
          const sampleDuration = end ? (end - start) / calcPlaybackRate(event.note) : null;
          const actualDuration = settings.oneShot
            ? (sampleDuration ?? 999)
            : sampleDuration !== null
              ? Math.min(sampleDuration, event.duration)
              : event.duration;
          const bufDuration = sampler.bufferDuration;
          const offset = settings.reverse
            ? bufDuration - (end ?? bufDuration)
            : start;
          sampler.triggerAttackRelease(
            event.note,
            actualDuration,
            time,
            offset,
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
