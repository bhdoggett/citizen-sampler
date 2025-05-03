// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import quantize from "../functions/quantize";
import toWav from "audiobuffer-to-wav";

const useDownloadWavStems = () => {
  const { allSampleData, samplersRef, makeSampler } = useAudioContext();

  const allIds = Object.keys(samplersRef.current);
  const loopEnd = Tone.getTransport().loopEnd;
  const loopDuration = Tone.Time(loopEnd).toSeconds();

  const getAudioBuffer = async (id: string) => {
    const { events, settings } = allSampleData[id];
    if (events.length === 0) return null;

    // await offlineSamplerWithFx.sampler.loaded;
    debugger;
    const toneBuffer = await Tone.Offline(async ({ transport }) => {
      /// I need to recreate the entire audio context here per sample.
      // create a new tone.sampler (with FX)
      // create connect the smapler to all the fx nodes

      const offlineSamplerWithFx = makeSampler(id, allSampleData[id].url, true);

      // console.log(
      //   "Sampler loaded keys:",
      //   offlineSamplerWithFx.sampler._buffers._buffers
      // );

      // await offlineSamplerWithFx.sampler.loaded;

      offlineSamplerWithFx.panVol.toDestination();

      const toneEvents = events
        .filter((event) => event.startTime !== null)
        .map((event) => {
          const eventTime = settings.quantize
            ? quantize(event.startTime as number, settings.quantVal)
            : event.startTime;
          return [
            eventTime,
            {
              startTime: eventTime,
              duration: event.duration,
            },
          ];
        });

      const part = new Tone.Part((time, event) => {
        if (
          typeof event !== "object" ||
          event === null ||
          !("duration" in event)
        )
          return;

        offlineSamplerWithFx.sampler.triggerAttackRelease(
          "C4",
          event.duration ?? 0,
          time
        );
      }, toneEvents);

      part.start(0);
      transport.start();
    }, loopDuration);

    return toneBuffer;
  };

  const translateBufferToWavUrl = async (toneBuffer: Tone.ToneAudioBuffer) => {
    const wavData = toWav(toneBuffer);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    return url;
  };

  const downloadWav = async (id: string) => {
    const toneBuffer = await getAudioBuffer(id);
    if (!toneBuffer) {
      console.warn(`No audio buffer generated for ID: ${id}`);
      return;
    }

    const wavUrl = translateBufferToWavUrl(toneBuffer as Tone.ToneAudioBuffer);
    if (!wavUrl) {
      console.warn(`No WAV URL generated for ID: ${id}`);
      return;
    }
    const link = document.createElement("a");

    link.href = await wavUrl;
    link.download = `${id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllWavs = () => {
    allIds.forEach((id) => {
      downloadWav(id);
    });
  };

  return downloadAllWavs;
};

export default useDownloadWavStems;
