// import Recorder from "recorder-js";
import * as Tone from "tone";
import { useAudioContext } from "../contexts/AudioContext";
import quantize from "../functions/quantize";
import toWav from "audiobuffer-to-wav";
import { SampleEvent } from "@/types/SampleTypes";

const useDownloadWavStems = () => {
  const { allSampleData, samplersRef, makeSampler } = useAudioContext();

  const allIds = Object.keys(samplersRef.current);
  const loopEnd = Tone.getTransport().loopEnd;
  const loopDuration = Tone.Time(loopEnd).toSeconds();

  const getAudioBuffer = async (id: string) => {
    const { events, settings } = allSampleData[id];
    if (events.length === 0) return null;

    const toneBuffer = await Tone.Offline(async ({ transport }) => {
      const offlineSamplerWithFx = await makeSampler(
        id,
        allSampleData[id].url,
        true
      );

      const createTonePartFromEvents = (events: SampleEvent[]) => {
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
        return part;
      };

      const part = createTonePartFromEvents(events);

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
    Tone.start();
  };

  return downloadAllWavs;
};

export default useDownloadWavStems;
