import toWav from "audiobuffer-to-wav";
import { useAudioContext } from "../contexts/AudioContext";
import { useEngine } from "src/lib/engine/react";
import type { StemAudio } from "src/lib/engine/protocol";
import type { LoopName } from "../../types/audioTypes";
import { LOOP_NAMES } from "src/lib/constants/loops";
import { padNumber } from "src/lib/constants/padLayout";

// The shape audiobuffer-to-wav reads from an AudioBuffer
function asAudioBuffer(stem: StemAudio): AudioBuffer {
  return {
    numberOfChannels: stem.channels.length,
    sampleRate: stem.sampleRate,
    length: stem.channels[0]?.length ?? 0,
    duration: (stem.channels[0]?.length ?? 0) / stem.sampleRate,
    getChannelData: (channel: number) => stem.channels[channel],
  } as AudioBuffer;
}

const useDownloadWavStems = () => {
  const { allSampleData, songTitle } = useAudioContext();
  const engine = useEngine();

  // Download a given pad's loop as a WAV file
  const downloadWav = async (id: string, loop: LoopName) => {
    const stem = await engine.renderStem(id, loop);
    if (!stem) return;

    const wavData = toWav(asAudioBuffer(stem));
    const url = URL.createObjectURL(new Blob([wavData], { type: "audio/wav" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${songTitle}-${padNumber(id)}-${loop}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllWavs = async () => {
    // One render at a time
    for (const id of Object.keys(allSampleData)) {
      for (const loop of LOOP_NAMES) {
        try {
          await downloadWav(id, loop);
        } catch (error) {
          console.error(`Failed to download ${id}-${loop}:`, error);
        }
      }
    }
    // Offline rendering swaps the audio context, so make sure the live one runs
    await engine.start();
  };

  return downloadAllWavs;
};

export default useDownloadWavStems;
