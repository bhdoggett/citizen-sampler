import { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { useAudioContext } from "../../app/contexts/AudioContext";

type WaveformProps = {
  audioUrl: string;
};

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef(RegionsPlugin.create());
  const {
    // waveformIsPlaying,
    selectedSampleId,
    allSampleData,
    updateSamplerStateSettings,
  } = useAudioContext();
  const [zoom, setZoom] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = allSampleData[selectedSampleId];

  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
    }

    if (!containerRef.current) return;

    const regionsPlugin = regionsPluginRef.current;
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "blue",
      interact: false,
      height: 60,
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
        color: "rgba(255, 0, 0, 0.2)",
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

  // Zoom functionality
  useEffect(() => {
    if (!waveSurferRef.current || !scrollRef.current) return;

    const ws = waveSurferRef.current;
    const scrollContainer = scrollRef.current;

    // Apply zoom level
    ws.zoom(zoom);

    const regions = regionsPluginRef.current.getRegions();
    const region = Object.values(regions)[0];
    if (region) {
      const duration = ws.getDuration();
      const pixelPerSecond = zoom / duration;
      const regionCenter = (region.start + region.end) / 2;
      const centerX = regionCenter * pixelPerSecond;

      const containerWidth = scrollContainer.clientWidth;
      scrollContainer.scrollLeft = Math.max(centerX - containerWidth / 2, 0);
    }
  }, [zoom]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check for two-finger pinch/zoom gesture
      if (e.ctrlKey) {
        e.preventDefault(); // prevent zooming the page
        if (e.deltaY < 0) {
          // Zoom in
          setZoom((prev) => Math.min(prev + 5, 1000)); // Optional max
        } else if (e.deltaY > 0) {
          // Zoom out
          setZoom((prev) => Math.max(prev - 5, 0)); // Optional min
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);
  // // Visual-only playback animation
  // useEffect(() => {
  //   const ws = waveSurferRef.current;
  //   if (!ws) return;

  //   if (waveformIsPlaying) {
  //     const { start = 0, end } = allSampleData[selectedSampleId].settings;

  //     ws.setVolume(0); // mute so it doesn't interfere
  //     // play only the region
  //     if (end) {
  //       ws.play(start, end);
  //     } else ws.play(start);
  //   } else {
  //     if (ws.isPlaying()) {
  //       ws.pause();
  //       ws.seekTo(0);
  //     }
  //   }
  // }, [waveformIsPlaying, allSampleData, selectedSampleId]);

  return (
    <div className="flex w-[650px] justify-center mb-2">
      {/* Border wrapper */}
      <div className="border border-slate-600 w-[575px]" ref={scrollRef}>
        <div className="w-[600px]">
          <div
            ref={containerRef}
            className="cursor-pointer bg-white shadow-inner shadow-slate-700 w-[573px] box-border"
          />
        </div>
      </div>

      {/* Zoom buttons */}
      <div className="flex flex-col items-center my-auto space-y-2 ml-2">
        <button
          onClick={() => {
            let zoomDiff;
            if (zoom === 0) {
              zoomDiff = 60;
            } else {
              zoomDiff = 20;
            }
            setZoom((prev) => Math.min(prev + zoomDiff, 1000));
          }}
          className="text-sm px-1 bg-slate-400 hover:bg-slate-500 text-white border border-black shadow-inner shadow-slate-800"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(prev - 20, 0))}
          className="text-sm px-1 bg-slate-400 hover:bg-slate-500 text-white border border-black shadow-inner shadow-slate-800"
        >
          -
        </button>
      </div>
    </div>
  );
};

export default Waveform;
