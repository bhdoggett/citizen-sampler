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
    if (events.length === 0) return;

    // await offlineSamplerWithFx.sampler.loaded;

    const toneBuffer = await Tone.Offline(async ({ transport }) => {
      /// I need to recreate the entire audio context here per sample.
      // create a new tone.sampler (with FX)
      // create connect the smapler to all the fx nodes
      const offlineSamplerWithFx = makeSampler(id, allSampleData[id].url, true);

      await offlineSamplerWithFx.sampler.loaded;

      offlineSamplerWithFx.panVol.toDestination();

      const toneEvents = events.map((event, idx) => {
        const eventTime = settings.quantize
          ? quantize(event.startTime, settings.quantVal)
          : event.startTime;
        console.log(`event at index: ${idx}`, event);
        return [
          eventTime,
          {
            startTime: eventTime,
            duration: event.duration,
          },
        ];
      });

      const part = new Tone.Part((time, event) => {
        offlineSamplerWithFx.sampler.triggerAttackRelease(
          "C4",
          event.duration,
          time
        );
      }, toneEvents);
      part.start(0);
      transport.start();
    }, loopDuration);

    return toneBuffer;
  };

  const translateBufferToWavUrl = async (toneBuffer: Tone.ToneAudioBuffer) => {
    const wavData = toWav(await toneBuffer.get());
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    return url;
  };

  const downloadWav = async (id: string) => {
    const toneBuffer = await getAudioBuffer(id);
    const wavUrl = translateBufferToWavUrl(toneBuffer);
    const link = document.createElement("a");
    link.href = wavUrl;
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
