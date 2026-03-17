import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { useAudioContext } from "../../app/contexts/AudioContext";
import {
  decodeAudioUrl,
  extractPeaks,
  drawWaveform,
} from "../../lib/audio/decodeAudio";
import { calcPlaybackRate } from "../../lib/audio/util/calcPlaybackRate";

type WaveformProps = {
  audioUrl: string;
};

const PEAK_BINS = 4000;

const Waveform: React.FC<WaveformProps> = ({ audioUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // scrollable outer
  const wrapperRef = useRef<HTMLDivElement>(null); // inner relative wrapper
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [zoom, setZoom] = useState(0);

  // Region fractions (0–1) derived from settings
  const [startFrac, setStartFrac] = useState(0);
  const [endFrac, setEndFrac] = useState(1);
  const [isRegionDragging, setIsRegionDragging] = useState(false);

  // Refs so zoom effect can read fracs without them as deps
  const startFracRef = useRef(startFrac);
  const endFracRef = useRef(endFrac);
  startFracRef.current = startFrac;
  endFracRef.current = endFrac;

  const {
    selectedSampleId,
    allSampleData,
    updateSamplerStateSettings,
    storeAudioInIndexedDB,
    getCachedAudioUrlFromIndexedDB,
    samplersRef,
  } = useAudioContext();

  const { settings } = allSampleData[selectedSampleId];

  // Playhead
  const playheadRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Stable refs so the init effect only runs when audioUrl changes
  const selectedSampleIdRef = useRef(selectedSampleId);
  const getCachedRef = useRef(getCachedAudioUrlFromIndexedDB);
  const storeRef = useRef(storeAudioInIndexedDB);

  useEffect(() => {
    selectedSampleIdRef.current = selectedSampleId;
    getCachedRef.current = getCachedAudioUrlFromIndexedDB;
    storeRef.current = storeAudioInIndexedDB;
  });

  // Canvas pixel width derived from zoom + duration
  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const canvasPixelWidth =
    zoom > 0 && duration > 0
      ? Math.max(containerWidth, zoom * duration)
      : containerWidth || undefined;

  // Redraw canvas using cached peaks (no extractPeaks on zoom)
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const peaks = peaksRef.current;
    if (!canvas || !peaks) return;
    if (canvas.clientWidth < 1) return;
    drawWaveform(canvas, peaks, "#2026D6");
  }, []);

  // Load audio on url change
  useEffect(() => {
    setIsReady(false);
    audioBufferRef.current = null;
    setDuration(0);

    if (!audioUrl) return;

    let cancelled = false;

    const load = async () => {
      const cachedUrl = await getCachedRef.current(
        selectedSampleIdRef.current,
        audioUrl,
      );
      if (!cachedUrl) {
        storeRef.current(audioUrl, selectedSampleIdRef.current);
      }
      const buffer = await decodeAudioUrl(cachedUrl ?? audioUrl);
      if (cancelled) return;
      audioBufferRef.current = buffer;
      peaksRef.current = extractPeaks(buffer, PEAK_BINS, true);
      setDuration(buffer.duration);
      setIsReady(true);
    };

    load().catch((err) => {
      if (err?.name !== "AbortError") console.warn("Error loading audio:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  // Redraw when ready or zoom changes
  useEffect(() => {
    if (isReady) redrawCanvas();
  }, [isReady, redrawCanvas]);

  // Sync region fractions from settings when ready or settings change
  useEffect(() => {
    if (!isReady || duration === 0) return;
    setStartFrac((settings.start ?? 0) / duration);
    setEndFrac((settings.end != null ? settings.end : duration) / duration);
  }, [isReady, duration, settings.start, settings.end]);

  // Reset zoom when sample changes
  useEffect(() => {
    setZoom(0);
  }, [selectedSampleId]);

  // Scroll to center of region after zoom change
  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    redrawCanvas();
    const scrollContainer = containerRef.current;
    const canvasW = canvasRef.current?.clientWidth ?? scrollContainer.clientWidth;
    const centerX = ((startFracRef.current + endFracRef.current) / 2) * canvasW;
    scrollContainer.scrollLeft = Math.max(
      centerX - scrollContainer.clientWidth / 2,
      0,
    );
  }, [zoom, isReady, redrawCanvas]);

  // Pinch-to-zoom via ctrl+wheel (on window so container scroll stays native)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      if (!containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      setZoom((prev) =>
        e.deltaY < 0 ? Math.min(prev + 5, 1000) : Math.max(prev - 5, 0),
      );
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  // Playhead rAF loop — direct DOM mutation, no re-renders
  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const el = playheadRef.current;
      if (!el) return;

      const sampler = samplersRef.current[selectedSampleId];
      const triggerTime = sampler?.triggerTime;
      if (triggerTime == null || durationRef.current === 0) {
        el.style.display = "none";
        return;
      }

      const playedNote = sampler.currentEvent.note;
      const rate = playedNote ? calcPlaybackRate(playedNote as Tone.Unit.Frequency) : 1;
      const elapsed = (Tone.now() - triggerTime) * rate;
      const s = settingsRef.current;
      const sampleStart = s.start ?? 0;
      const sampleEnd = s.end ?? durationRef.current;
      const sampleDur = sampleEnd - sampleStart;

      if (elapsed < 0 || elapsed > sampleDur) {
        el.style.display = "none";
        return;
      }

      const frac = (sampleStart + elapsed) / durationRef.current;
      el.style.display = "block";
      el.style.left = `${frac * 100}%`;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedSampleId, samplersRef]);

  // Region drag handlers
  const dragState = useRef<{
    handle: "start" | "end" | "region";
    startX: number;
    startFrac: number;
    startEndFrac?: number; // region drag only
  } | null>(null);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent, handle: "start" | "end") => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        handle,
        startX: e.clientX,
        startFrac: handle === "start" ? startFrac : endFrac,
      };
    },
    [startFrac, endFrac],
  );

  const onRegionPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        handle: "region",
        startX: e.clientX,
        startFrac,
        startEndFrac: endFrac,
      };
      setIsRegionDragging(true);
    },
    [startFrac, endFrac],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !canvasRef.current) return;
      const canvasW = canvasRef.current.clientWidth;
      const delta = (e.clientX - dragState.current.startX) / canvasW;
      if (dragState.current.handle === "region") {
        const width = dragState.current.startEndFrac! - dragState.current.startFrac;
        const newStart = Math.max(0, Math.min(1 - width, dragState.current.startFrac + delta));
        setStartFrac(newStart);
        setEndFrac(newStart + width);
      } else {
        const newFrac = Math.max(0, Math.min(1, dragState.current.startFrac + delta));
        if (dragState.current.handle === "start") {
          setStartFrac(Math.min(newFrac, endFrac - 0.01));
        } else {
          setEndFrac(Math.max(newFrac, startFrac + 0.01));
        }
      }
    },
    [startFrac, endFrac],
  );

  const onHandlePointerUp = useCallback(() => {
    if (!dragState.current || duration === 0) return;
    const handle = dragState.current.handle;
    const newStart =
      handle === "end" ? (settings.start ?? 0) : startFrac * duration;
    const newEnd =
      handle === "start" ? (settings.end ?? duration) : endFrac * duration;
    updateSamplerStateSettings(selectedSampleId, {
      start: newStart,
      end: newEnd,
    });
    dragState.current = null;
    setIsRegionDragging(false);
  }, [
    startFrac,
    endFrac,
    duration,
    selectedSampleId,
    settings.start,
    settings.end,
    updateSamplerStateSettings,
  ]);

  return (
    <div className="flex w-full px-3 justify-center mb-2">
      {/* Scrollable border wrapper */}
      <div
        className="border border-slate-600 w-full overflow-x-auto"
        ref={containerRef}
      >
        <div
          className="relative"
          ref={wrapperRef}
          style={{
            width: canvasPixelWidth,
            background: `linear-gradient(to right, #ffffff ${startFrac * 100}%, #ffc8c8 ${startFrac * 100}%, #ffc8c8 ${endFrac * 100}%, #ffffff ${endFrac * 100}%)`,
          }}
        >
          <canvas
            ref={canvasRef}
            height={60}
            className="block w-full shadow-inner shadow-slate-900"
            style={{ height: 60 }}
          />
          {isReady && (
            <>
              {/* Draggable region */}
              <div
                className="absolute top-0 h-full z-5"
                style={{
                  left: `${startFrac * 100}%`,
                  width: `${(endFrac - startFrac) * 100}%`,
                  cursor: isRegionDragging ? "grabbing" : "grab",
                }}
                onPointerDown={onRegionPointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              />
              {/* Left handle */}
              <div
                className="absolute top-0 h-full z-10"
                style={{
                  left: `${startFrac * 100}%`,
                  width: 2,
                  cursor: "ew-resize",
                  background: "rgba(0,0,0,0.85)",
                  transform: "translateX(-50%)",
                }}
                onPointerDown={(e) => onHandlePointerDown(e, "start")}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              />
              {/* Right handle */}
              <div
                className="absolute top-0 h-full z-10"
                style={{
                  left: `${endFrac * 100}%`,
                  width: 2,
                  cursor: "ew-resize",
                  background: "rgba(0,0,0,0.85)",
                  transform: "translateX(-50%)",
                }}
                onPointerDown={(e) => onHandlePointerDown(e, "end")}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              />
            </>
          )}
          {/* Playhead */}
          <div
            ref={playheadRef}
            className="absolute top-0 h-full pointer-events-none z-20"
            style={{
              display: "none",
              width: 2,
              background: "rgba(255, 0, 0, 0.85)",
              transform: "translateX(-50%)",
            }}
          />
        </div>
      </div>

      {/* Zoom buttons */}
      <div className="flex flex-col items-center my-auto space-y-2 ml-2">
        <button
          onClick={() => {
            const zoomDiff = zoom === 0 ? 100 : 20;
            setZoom((prev) => Math.min(prev + zoomDiff, 1000));
          }}
          disabled={zoom >= 1000}
          className="text-sm px-1 bg-slate-400 hover:bg-slate-500 text-white border border-black shadow-inner shadow-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(prev - 20, 0))}
          disabled={zoom <= 0}
          className="text-sm px-1 bg-slate-400 hover:bg-slate-500 text-white border border-black shadow-inner shadow-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          -
        </button>
      </div>
    </div>
  );
};

export default Waveform;
