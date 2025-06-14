// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import quantize from "../functions/quantize";
import toWav from "audiobuffer-to-wav";
import type { LoopName } from "../../../../shared/types/audioTypes";

const useDownloadWavStems = () => {
  const { allSampleData, samplersRef, allLoopSettings, makeSamplerWithFX } =
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
          ? quantize(eventStart, settings.quantVal as number)
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

      const { sampler } = offlineSamplerWithFx;

      // // Wait for sampler to be fully loaded
      // if (!sampler.loaded) {
      //   await new Promise<void>((resolve) => {
      //     const checkLoaded = () => {
      //       if (sampler.loaded) {
      //         resolve();
      //       } else {
      //         setTimeout(checkLoaded, 10);
      //       }
      //     };
      //     checkLoaded();
      //   });
      // }

      // await new Promise<void>((resolve, reject) => {
      //   const timeout = setTimeout(
      //     () => reject(new Error("Sampler load timeout")),
      //     5000
      //   );
      //   const checkLoaded = () => {
      //     if (sampler.loaded) {
      //       clearTimeout(timeout);
      //       resolve();
      //     } else {
      //       setTimeout(checkLoaded, 10);
      //     }
      //   };
      //   checkLoaded();
      // });

      console.log("sampler loaded", sampler.loaded, id);

      const toneEvents = events
        .filter((event) => event.startTime !== null)
        .map((event) => {
          if (!event.startTime) return;
          const startTimeInSeconds = Tone.Ticks(event.startTime).toSeconds();
          const eventTime = settings.quantize
            ? quantize(startTimeInSeconds, settings.quantVal)
            : startTimeInSeconds;
          return [
            eventTime,
            {
              startTime: eventTime,
              duration: event.duration,
              note: event.note,
              velocity: event.velocity,
            },
          ];
        })
        .filter(Boolean);

      console.log("offline tone events:", toneEvents);

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
      }, toneEvents);

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
    link.download = `${id}-${loop}.wav`;
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
