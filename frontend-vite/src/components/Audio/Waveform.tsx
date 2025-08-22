import { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { useAudioContext } from "../../contexts/AudioContext";

type WaveformProps = {
  audioUrl: string;
};

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const [waveSurferIsReady, setWaveSurferIsReady] = useState<boolean>(false);
  const {
    selectedSampleId,
    allSampleData,
    updateSamplerStateSettings,
    storeAudioInIndexedDB,
    getCachedAudioUrlFromIndexedDB,
  } = useAudioContext();
  const [zoom, setZoom] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = allSampleData[selectedSampleId];

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    waveSurferRef.current?.destroy();

    regionsPluginRef.current = RegionsPlugin.create();
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

    waveSurferRef.current = wavesurfer;

    const loadAudio = async () => {
      const cachedUrl = await getCachedAudioUrlFromIndexedDB(
        selectedSampleId,
        audioUrl
      );

      if (!cachedUrl) {
        storeAudioInIndexedDB(audioUrl, selectedSampleId); // Cache it for next time
      }
      wavesurfer.load(cachedUrl ?? audioUrl).catch((error) => {
        if (error.name !== "AbortError") {
          console.warn("Error loading audio:", error);
        }
      });
    };

    loadAudio();

    wavesurfer.on("ready", () => {
      setWaveSurferIsReady(true);
    });

    return () => {
      setWaveSurferIsReady(false);
      wavesurfer.destroy();
    };
  }, [
    audioUrl,
    containerRef,
    selectedSampleId,
    getCachedAudioUrlFromIndexedDB,
    storeAudioInIndexedDB,
  ]);

  // Update Region settings change
  useEffect(() => {
    const wavesurfer = waveSurferRef.current;
    if (!wavesurfer) return;

    let plugin = regionsPluginRef.current;

    if (!plugin) {
      plugin = RegionsPlugin.create();
      regionsPluginRef.current = plugin;
    }

    const region = plugin.addRegion({
      start: settings.start ?? 0,
      end: settings.end ?? wavesurfer.getDuration(),
      drag: true,
      resize: true,
      color: "rgba(255, 0, 0, 0.2)",
    });

    region.on("update-end", () => {
      updateSamplerStateSettings(selectedSampleId, {
        start: region.start,
        end: region.end,
      });
    });

    plugin.on("region-created", (newRegion) => {
      plugin.getRegions().forEach((r) => {
        if (r.id !== newRegion.id) r.remove();
      });
    });
  }, [
    settings.start,
    settings.end,
    selectedSampleId,
    updateSamplerStateSettings,
    waveSurferIsReady,
  ]);

  // Reset zoom to zero when selectedSampleId changes
  useEffect(() => {
    setZoom(0);
  }, [selectedSampleId]);

  // Zoom functionality
  useEffect(() => {
    if (
      !waveSurferRef.current ||
      !scrollRef.current ||
      !regionsPluginRef.current ||
      !waveSurferIsReady
    ) {
      return;
    }

    const ws = waveSurferRef.current;
    const scrollContainer = scrollRef.current;
    const plugin = regionsPluginRef.current;

    // 🛡 Safeguard against race condition
    if (!ws || !plugin || !scrollContainer || !waveSurferIsReady) return;

    const duration = ws.getDuration();
    if (!duration || isNaN(duration) || duration < 0.1) return;

    try {
      ws.zoom(zoom);
    } catch (err) {
      console.warn("Zoom failed — audio likely not fully loaded yet:", err);
      return;
    }

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
  }, [zoom, waveSurferIsReady]);

  // Handle pinch/zoom with two-finger gesture
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
