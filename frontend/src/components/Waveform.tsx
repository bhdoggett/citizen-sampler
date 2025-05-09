import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { useAudioContext } from "../app/contexts/AudioContext";

type WaveformProps = {
  audioUrl: string;
};

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const {
    waveformIsPlaying,
    selectedSampleId,
    allSampleData,
    updateSamplerStateSettings,
  } = useAudioContext();

  const { settings } = allSampleData[selectedSampleId];

  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
    }

    if (!containerRef.current) return;

    const regionsPlugin = RegionsPlugin.create();
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "blue",
      progressColor: "red",
      cursorColor: "red",
      interact: true,
      height: 100,
      barWidth: NaN,
      backend: "WebAudio",
      normalize: true,
      plugins: [regionsPlugin],
    });

    wavesurfer.load(audioUrl);

    // When ready, add a region
    wavesurfer.on("ready", () => {
      const regionStart = settings.start ?? 0;
      const regionEnd = settings.end ?? wavesurfer.getDuration();

      waveSurferRef.current = wavesurfer;

      // Clear any preexisting region
      regionsPlugin.clearRegions();

      const region = regionsPlugin.addRegion({
        start: regionStart,
        end: regionEnd,
        drag: true,
        resize: true,
        color: "rgba(0, 255, 0, 0.1)",
      });

      // Update global state when region is updated
      region.on("update-end", () => {
        updateSamplerStateSettings(selectedSampleId, {
          start: region.start,
          end: region.end,
        });
      });
    });

    // Ensure only one region can exist at a time
    regionsPlugin.on("region-created", (newRegion) => {
      regionsPlugin.getRegions().forEach((region) => {
        if (region.id !== newRegion.id) {
          region.remove();
        }
      });
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [
    audioUrl,
    settings.start,
    settings.end,
    selectedSampleId,
    updateSamplerStateSettings,
  ]);

  // Visual-only playback animation
  useEffect(() => {
    const ws = waveSurferRef.current;
    if (!ws) return;

    if (waveformIsPlaying) {
      const { start = 0, end } = allSampleData[selectedSampleId].settings;

      ws.setVolume(0); // mute so it doesn't interfere
      // play only the region
      if (end) {
        ws.play(start, end);
      } else ws.play(start);
    } else {
      if (ws.isPlaying()) {
        ws.pause();
        ws.seekTo(0);
      }
    }
  }, [waveformIsPlaying, allSampleData, selectedSampleId]);

  return (
    <div
      ref={containerRef}
      className="cursor-pointer border border-gray-400 bg-white mx-10 shadow-inner shadow-slate-700"
    />
  );
};

export default Waveform;
