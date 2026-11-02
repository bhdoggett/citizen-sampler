// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import getScheduleEvents from "../../lib/audio/util/getScheduleEvents";
import { calcPlaybackRate } from "../../lib/audio/util/calcPlaybackRate";
import { calcRenderDuration } from "../../lib/audio/util/calcRenderDuration";
import toWav from "audiobuffer-to-wav";
import { applySoundSettings } from "../../lib/audio/applySoundSettings";
import { computeGain } from "../../lib/audio/muteSolo";
import { applyLoopSettings } from "../../lib/audio/applyLoopSettings";
import { calcTriggerParams } from "../../lib/audio/util/calcTriggerParams";
import type { LoopName } from "../../types/audioTypes";
import { LOOP_NAMES } from "src/lib/constants/loops";
import { padNumber } from "src/lib/constants/padLayout";

const useDownloadWavStems = () => {
  const {
    allSampleData,
    samplers,
    allLoopSettings,
    makeSamplerWithFX,
    solosExist,
    songTitle,
  } = useAudioContext();
  const allIds = Object.keys(samplers);

  // Function to get Audio Buffer for a given sampler's loop recording
  const getAudioBuffer = async (id: string, loop: LoopName) => {
    const loopSettings = allLoopSettings[loop];
    const sampleData = allSampleData[id];
    const { settings } = sampleData;
    const events = sampleData.events[loop];

    if (!loopSettings || events.length === 0) return null;

    // Use this loop's own tempo and length, not whichever loop is live
    const { bpm, beats, bars } = loopSettings;
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
      applyLoopSettings(transport, loopSettings);

      const offlineSamplerWithFx = await makeSamplerWithFX(
        id,
        allSampleData[id].url,
        true
      );

      applySoundSettings(offlineSamplerWithFx, settings);
      // Muted pads render silent stems, as in the live mix
      offlineSamplerWithFx.gain.gain.value = computeGain(settings, solosExist);

      const { sampler } = offlineSamplerWithFx;

      const part = new Tone.Part((time, event) => {
        if (
          typeof event === "object" &&
          event !== null &&
          "duration" in event &&
          event.duration !== null
        ) {
          const { duration: actualDuration, offset } = calcTriggerParams(
            settings,
            calcPlaybackRate(event.note),
            event.duration,
            sampler.bufferDuration
          );
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
    const toneBuffer = await getAudioBuffer(id, loop);
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
    link.download = `${songTitle}-${padNumber(id)}-${loop}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllWavs = async () => {
    // Process each ID one at a time
    for (const id of allIds) {
      // Process each loop one at a time for this ID
      for (const loop of LOOP_NAMES) {
        try {
          await downloadWav(id, loop);
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
