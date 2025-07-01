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
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const { selectedSampleId, allSampleData, updateSamplerStateSettings } =
    useAudioContext();
  const [zoom, setZoom] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = allSampleData[selectedSampleId];

  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
    }

    if (regionsPluginRef.current) {
      regionsPluginRef.current.destroy();
      regionsPluginRef.current = null;
    }

    regionsPluginRef.current = RegionsPlugin.create();

    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "blue",
      interact: false,
      height: 60,
      barWidth: NaN,
      backend: "WebAudio",
      normalize: true,
      plugins: [regionsPluginRef.current],
    });

    // Load with promise handling
    wavesurfer.load(audioUrl).catch((error) => {
      if (error.name === "AbortError") {
        console.log("Audio load aborted - component unmounted or URL changed");
      } else {
        console.warn("Error loading audio:", error);
      }
    });

    // When ready, add a region
    wavesurfer.on("ready", () => {
      const regionStart = settings.start ?? 0;
      const regionEnd = settings.end ?? wavesurfer.getDuration();

      waveSurferRef.current = wavesurfer;

      // Clear any preexisting region
      if (!regionsPluginRef.current) return;
      regionsPluginRef.current.clearRegions();

      const region = regionsPluginRef.current.addRegion({
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
    regionsPluginRef.current.on("region-created", (newRegion) => {
      if (!regionsPluginRef.current) return;
      regionsPluginRef.current.getRegions().forEach((region) => {
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
    if (
      !waveSurferRef.current ||
      !scrollRef.current ||
      !regionsPluginRef.current
    )
      return;

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

  return (
    <div className="flex w-full px-3 justify-center mb-2">
      {/* Border wrapper */}
      <div
        className="border border-slate-600 w-full overflow-hidden"
        ref={scrollRef}
      >
        <div className="w-full">
          <div
            ref={containerRef}
            className="cursor-pointer bg-stone-50 shadow-inner shadow-slate-700 w-full box-border"
          />
        </div>
      </div>

      {/* Zoom buttons */}
      <div className="flex flex-col items-center my-auto space-y-2 ml-2">
        <button
          onClick={() => {
            let zoomDiff;
            if (zoom === 0) {
              zoomDiff = 100;
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
