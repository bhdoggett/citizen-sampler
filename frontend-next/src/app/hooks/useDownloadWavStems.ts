import toWav from "audiobuffer-to-wav";
import { useSongStore } from "src/lib/song/react";
import { useAudioContext } from "../contexts/AudioContext";
import { useUIContext } from "../contexts/UIContext";
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
  const { songTitle } = useAudioContext();
  const store = useSongStore();
  const engine = useEngine();
  const { openDialog } = useUIContext();

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

  // The desktop app and plugin write the files natively: a WebView ignores
  // browser downloads
  const saveStemsNatively = async (saveStems: NonNullable<typeof engine.saveStems>) => {
    const { saved, folder } = await saveStems(songTitle);
    openDialog({
      type: "api-response",
      message:
        saved > 0
          ? `Saved ${saved} ${saved === 1 ? "stem" : "stems"} to ${folder}`
          : "No stems to export: add hits to a loop first.",
    });
  };

  const downloadAllWavs = async () => {
    if (engine.saveStems) {
      await saveStemsNatively(engine.saveStems.bind(engine));
      return;
    }
    // One render at a time
    for (const id of Object.keys(store.getState().samples)) {
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
