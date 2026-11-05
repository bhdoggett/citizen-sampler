import * as Tone from "tone";
import type { AllLoopSettingsFE } from "src/types/audioTypesFE";
import type { LoopName } from "src/types/audioTypes";
import getScheduleEvents, { isPlayableEvent } from "src/lib/audio/util/getScheduleEvents";
import { calcTriggerParams } from "src/lib/audio/util/calcTriggerParams";
import { calcPlaybackRate } from "src/lib/audio/util/calcPlaybackRate";
import { calcReleaseDelay } from "src/lib/audio/util/calcReleaseDelay";
import { calcRenderDuration } from "src/lib/audio/util/calcRenderDuration";
import { loopDurationSeconds } from "src/lib/audio/util/timing";
import { computeGain } from "src/lib/audio/muteSolo";
import { detectPitch } from "src/lib/audio/pitchDetection";
import {
  getCachedAudioUrlFromIndexedDB,
  storeAudioInIndexedDB,
} from "src/lib/audio/audioCache";
import { createLiveInput, type LiveInput } from "../liveInput";
import type {
  Engine,
  EngineCommand,
  EngineEvent,
  PadState,
  StemAudio,
} from "../protocol";
import { applySoundSettings } from "./applySoundSettings";
import { applyLoopSettings } from "./applyLoopSettings";
import { createVoice, disposeVoice } from "./voice";
import type { SamplerWithFX } from "./SamplerWithFX";

type PadEntry = {
  state: PadState;
  voice: SamplerWithFX | null;
  // Bumped on every load so a slow load can't replace a newer one
  loadId: number;
  part: Tone.Part | null;
};

// Rebuild a pad's playback only when what it plays, or when, has changed
function scheduleChanged(prev: PadState, next: PadState): boolean {
  return (
    prev.events !== next.events ||
    prev.settings.quantize !== next.settings.quantize ||
    prev.settings.quantVal !== next.settings.quantVal
  );
}

// The web engine: Tone.js behind the Engine boundary. It follows the pad and
// loop state it is sent and owns every Tone object.
export class ToneEngine implements Engine {
  private listeners = new Set<(event: EngineEvent) => void>();
  private pads = new Map<string, PadEntry>();
  private loops: AllLoopSettingsFE | null = null;
  private currentLoop: LoopName = "A";
  private playing = false;
  private recording = false;
  private loading = 0;
  private master = new Tone.Gain(1).toDestination();
  private metronome: Tone.Sampler;
  private metronomeGain = new Tone.Gain(0).toDestination();
  private metronomeEventId: number;
  private live: LiveInput;
  private tunerPadId: string | null = null;
  private tunerFrame: number | null = null;
  private lastPitch: number | null = null;
  private preview: { player: Tone.Player; url: string } | null = null;
  private loopListener: (time: number) => void;

  constructor() {
    this.metronome = new Tone.Sampler({
      urls: { C6: "hi-block.wav", G5: "lo-block.wav" },
      baseUrl: "/samples/metronome/",
    }).connect(this.metronomeGain);

    const transport = Tone.getTransport();
    this.metronomeEventId = transport.scheduleRepeat((time) => {
      const timing = this.timing(this.currentLoop);
      if (!timing) return;
      const [, beat] = String(transport.position).split(":").map(Number);
      const note = beat % timing.beats === 0 ? "C6" : "G5";
      this.metronome.triggerAttackRelease(note, "8n", time);
    }, "4n");

    // Re-anchor the UI's playheads at the top of every loop
    this.loopListener = (time: number) => {
      Tone.getDraw().schedule(() => this.emitTransport(), time);
    };
    transport.on("loop", this.loopListener);

    this.live = createLiveInput({
      attack: (padId, note, velocity) => this.attack(padId, note, velocity),
      releaseVoice: (padId, note) =>
        this.pads.get(padId)?.voice?.sampler.triggerRelease(note, Tone.now()),
      padSettings: (padId) => {
        const settings = this.pads.get(padId)?.state.settings;
        return { oneShot: settings?.oneShot ?? false, end: settings?.end ?? null };
      },
      recordingPosition: () =>
        this.playing && this.recording
          ? { loop: this.currentLoop, ticks: Tone.getTransport().ticks }
          : null,
      isRecording: () => this.playing && this.recording,
      transportSeconds: () => Tone.getTransport().seconds,
      loopTiming: (loop) => this.timing(loop),
      emit: (event) => this.emit(event),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    });
  }

  send(command: EngineCommand): void {
    switch (command.type) {
      case "setPad":
        return this.setPad(command.padId, command.pad);
      case "removePad":
        return this.removePad(command.padId);
      case "setLoops":
        return this.setLoops(command.loops);
      case "setCurrentLoop":
        return this.setCurrentLoop(command.loop);
      case "play":
        return this.play();
      case "stop":
        return this.stop();
      case "setRecording":
        this.recording = command.on;
        return this.emitTransport();
      case "setMetronome":
        this.metronomeGain.gain.setValueAtTime(command.on ? 1 : 0, Tone.now());
        return;
      case "press":
        // A press is a user gesture, so it may unlock audio
        if (Tone.getContext().state !== "running") void Tone.start();
        return this.live.press(command.padId, command.note, command.velocity);
      case "release":
        return this.live.release(command.padId, command.note);
      case "setTunerPad":
        return this.setTunerPad(command.padId);
      case "previewSample":
        return this.previewSample(command.url);
      case "stopPreview":
        return this.stopPreview();
      // The web engine has no host
      case "requestHostContext":
        return;
    }
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(): Promise<void> {
    await Tone.start();
  }

  dispose(): void {
    this.stop();
    this.live.reset();
    this.setTunerPad(null);
    this.stopPreview();
    const transport = Tone.getTransport();
    transport.clear(this.metronomeEventId);
    transport.off("loop", this.loopListener);
    this.pads.forEach((entry) => {
      entry.part?.dispose();
      if (entry.voice) disposeVoice(entry.voice);
    });
    this.pads.clear();
    this.metronome.dispose();
    this.metronomeGain.dispose();
    this.master.dispose();
    this.listeners.clear();
  }

  private emit(event: EngineEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private timing(loop: LoopName) {
    return this.loops?.[loop] ?? null;
  }

  private emitTransport(): void {
    const timing = this.timing(this.currentLoop);
    const loopDuration = timing ? loopDurationSeconds(timing) : 0;
    const transport = Tone.getTransport();
    // Where the listener is now, not where the scheduler has read ahead to
    const seconds = this.playing ? transport.getSecondsAtTime(Tone.immediate()) : 0;
    this.emit({
      type: "transport",
      playing: this.playing,
      recording: this.recording,
      loop: this.currentLoop,
      position: loopDuration > 0 ? Math.max(0, seconds) % loopDuration : 0,
      loopDuration,
    });
  }

  // ---- Pads ----

  private setPad(padId: string, state: PadState): void {
    const entry = this.pads.get(padId);
    if (!entry) {
      this.pads.set(padId, { state, voice: null, loadId: 0, part: null });
      this.loadVoice(padId);
      return;
    }

    const prev = entry.state;
    entry.state = state;
    if (prev.url !== state.url) {
      this.loadVoice(padId);
      return;
    }
    if (prev.settings !== state.settings && entry.voice) {
      applySoundSettings(entry.voice, state.settings);
      this.applyGains();
    }
    if (scheduleChanged(prev, state)) this.schedulePad(padId);
  }

  private removePad(padId: string): void {
    const entry = this.pads.get(padId);
    if (!entry) return;
    entry.part?.dispose();
    if (entry.voice) disposeVoice(entry.voice);
    this.pads.delete(padId);
    this.applyGains();
  }

  private setLoading(delta: number): void {
    this.loading += delta;
    this.emit({ type: "loading", pending: this.loading });
  }

  private async loadVoice(padId: string): Promise<void> {
    const entry = this.pads.get(padId);
    if (!entry) return;
    const loadId = ++entry.loadId;
    const { url } = entry.state;

    // Drop the old sound right away so the pad goes silent while loading
    entry.part?.dispose();
    entry.part = null;
    if (entry.voice) disposeVoice(entry.voice);
    entry.voice = null;

    this.setLoading(1);
    try {
      const cached = await getCachedAudioUrlFromIndexedDB(padId, url).catch(() => null);
      const voice = await createVoice(padId, cached ?? url, this.master);
      const current = this.pads.get(padId);
      if (current !== entry || entry.loadId !== loadId) {
        disposeVoice(voice);
        return;
      }
      entry.voice = voice;
      applySoundSettings(voice, entry.state.settings);
      this.applyGains();
      this.schedulePad(padId);
      this.emit({ type: "padLoaded", padId, duration: voice.sampler.bufferDuration });
      if (!cached) void storeAudioInIndexedDB(url, padId);
    } catch (error) {
      console.error(`Error loading sample: ${padId}`, error);
      this.emit({ type: "padLoadFailed", padId, message: String(error) });
    } finally {
      this.setLoading(-1);
    }
  }

  // Mute and solo depend on every pad, so any pad's change can move them all
  private applyGains(): void {
    const solosExist = [...this.pads.values()].some((e) => e.state.settings.solo);
    this.pads.forEach((entry) => {
      if (entry.voice) {
        entry.voice.gain.gain.value = computeGain(entry.state.settings, solosExist);
      }
    });
  }

  private attack(padId: string, note: string, velocity: number): number | null {
    const entry = this.pads.get(padId);
    const voice = entry?.voice;
    if (!entry || !voice) return null;
    const { start, end, reverse } = entry.state.settings;
    const bufDuration = voice.sampler.bufferDuration;
    const offset = reverse ? bufDuration - (end ?? bufDuration) : start;
    voice.sampler.triggerAttack(note, Tone.now(), offset, velocity);
    return calcReleaseDelay(
      start,
      end,
      bufDuration,
      calcPlaybackRate(note as Tone.Unit.Frequency),
    );
  }

  // ---- Transport and playback ----

  private setLoops(loops: AllLoopSettingsFE): void {
    const prevTiming = this.timing(this.currentLoop);
    this.loops = loops;
    const timing = this.timing(this.currentLoop);
    if (!timing) return;
    if (timing !== prevTiming) {
      applyLoopSettings(Tone.getTransport(), timing);
      this.scheduleAll();
      this.emitTransport();
    }
  }

  private setCurrentLoop(loop: LoopName): void {
    if (loop === this.currentLoop) return;
    this.currentLoop = loop;
    const transport = Tone.getTransport();
    const timing = this.timing(loop);
    if (timing) applyLoopSettings(transport, timing);
    // Restart from the top when switching loops
    if (this.playing) {
      transport.stop();
      transport.position = "0:0:0";
      transport.start();
    } else {
      transport.position = "0:0:0";
    }
    this.scheduleAll();
    this.emitTransport();
  }

  private play(): void {
    if (this.playing) return;
    void Tone.start();
    this.playing = true;
    this.scheduleAll();
    Tone.getTransport().start();
    this.emitTransport();
  }

  private stop(): void {
    if (!this.playing) return;
    Tone.getTransport().stop();
    this.playing = false;
    this.recording = false;
    this.scheduleAll();
    this.emitTransport();
  }

  private scheduleAll(): void {
    this.pads.forEach((_, padId) => this.schedulePad(padId));
  }

  // One Tone.Part per pad for the current loop, rebuilt whenever its events,
  // quantize settings, the loop or the play state change
  private schedulePad(padId: string): void {
    const entry = this.pads.get(padId);
    if (!entry) return;
    entry.part?.dispose();
    entry.part = null;

    const timing = this.timing(this.currentLoop);
    if (!this.playing || !timing || !entry.voice) return;
    const events = getScheduleEvents(entry.state, this.currentLoop, timing);
    if (events.length === 0) return;

    const part = new Tone.Part((time, event) => {
      const voice = entry.voice;
      if (!voice || !isPlayableEvent(event)) return;
      // Read settings at play time, so edits apply on the next hit
      const { duration, offset } = calcTriggerParams(
        entry.state.settings,
        calcPlaybackRate(event.note),
        event.duration,
        voice.sampler.bufferDuration,
      );
      voice.sampler.triggerAttackRelease(event.note, duration, time, offset, event.velocity);
      const note = String(event.note);
      // Draw lines the start up with the sound, but drops callbacks that
      // run late (a background tab, a busy main thread). The end must never
      // be dropped or the pad stays lit, so it uses a plain timer.
      Tone.getDraw().schedule(() => this.emit({ type: "voiceStarted", padId, note }), time);
      const endMs = (time - Tone.now() + duration) * 1000;
      setTimeout(() => this.emit({ type: "voiceEnded", padId, note }), Math.max(0, endMs));
    }, events);
    part.start(0);
    entry.part = part;
  }

  // ---- Tuner ----

  private setTunerPad(padId: string | null): void {
    this.tunerPadId = padId;
    if (this.tunerFrame !== null) cancelAnimationFrame(this.tunerFrame);
    this.tunerFrame = null;
    this.lastPitch = null;
    if (padId === null) return;

    const poll = () => {
      this.tunerFrame = requestAnimationFrame(poll);
      const analyser = this.pads.get(padId)?.voice?.analyser;
      const frequency = analyser
        ? detectPitch(analyser.getValue() as Float32Array, Tone.getContext().sampleRate)
        : null;
      // Silence is sent once; readings are sent every frame so the UI can
      // count stable frames
      if (frequency === null && this.lastPitch === null) return;
      this.lastPitch = frequency;
      this.emit({ type: "pitch", padId, frequency });
    };
    this.tunerFrame = requestAnimationFrame(poll);
  }

  // ---- Sample preview ----

  private previewSample(url: string): void {
    this.stopPreview();
    const player: Tone.Player = new Tone.Player({
      url,
      onload: () => {
        if (this.preview?.player !== player) return;
        this.emit({ type: "previewStarted", url, duration: player.buffer.duration });
      },
      onerror: (error) => {
        if (this.preview?.player !== player) return;
        console.warn("Error loading preview:", error);
        this.preview = null;
        this.emit({ type: "previewEnded", url });
      },
    }).toDestination();
    player.autostart = true;
    // Fires when the sample plays out
    player.onstop = () => {
      if (this.preview?.player !== player) return;
      this.preview = null;
      player.dispose();
      this.emit({ type: "previewEnded", url });
    };
    this.preview = { player, url };
  }

  private stopPreview(): void {
    const preview = this.preview;
    if (!preview) return;
    this.preview = null;
    preview.player.stop();
    preview.player.dispose();
    this.emit({ type: "previewEnded", url: preview.url });
  }

  // ---- Stems ----

  async renderStem(padId: string, loop: LoopName): Promise<StemAudio | null> {
    const entry = this.pads.get(padId);
    const timing = this.timing(loop);
    if (!entry || !timing) return null;
    const { state } = entry;
    if ((state.events[loop] ?? []).length === 0) return null;

    const scheduleEvents = getScheduleEvents(state, loop, timing);
    // Render the full loop, plus any tail from events that ring past its end
    const renderDuration = calcRenderDuration(scheduleEvents, loopDurationSeconds(timing));
    const solosExist = [...this.pads.values()].some((e) => e.state.settings.solo);

    const buffer = await Tone.Offline(async ({ transport, destination }) => {
      // Use this loop's own tempo and length, not whichever loop is live
      applyLoopSettings(transport, timing);
      const voice = await createVoice(padId, state.url, destination);
      applySoundSettings(voice, state.settings);
      // Muted pads render silent stems, as in the live mix
      voice.gain.gain.value = computeGain(state.settings, solosExist);

      const part = new Tone.Part((time, event) => {
        if (!isPlayableEvent(event)) return;
        const { duration, offset } = calcTriggerParams(
          state.settings,
          calcPlaybackRate(event.note),
          event.duration,
          voice.sampler.bufferDuration,
        );
        voice.sampler.triggerAttackRelease(event.note, duration, time, offset, event.velocity);
      }, scheduleEvents);
      part.start(0);
      transport.start();
    }, renderDuration);

    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
      buffer.getChannelData(i),
    );
    return { sampleRate: buffer.sampleRate, channels };
  }
}
