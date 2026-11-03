# Audio engine boundary — design

Date: 2026-11-02. Branch: `bhdoggett/audio-engine`.

## Intent

Citizen Sampler will ship as a C++/JUCE desktop app and plugin, and the web
app stays long-term. Both use the same React UI. The JUCE build shows it in a
WebView.

Today the UI drives Tone.js directly. Components hold Tone nodes through
`samplersRef`, schedule their own `Tone.Part`s, read `Tone.getTransport()`
in animation loops, and keep press/release bookkeeping in refs. None of that
can cross into a C++ engine.

This project puts one boundary between the UI and the sound:

- **The UI** owns the song document and sends commands.
- **The engine** follows the document, makes the sound, and sends events back.

The web build runs a Tone.js engine behind that boundary. The desktop build
will run a C++ engine behind the same boundary. The UI can't tell which one it
is talking to.

## Goals

- **One `Engine` interface** with serializable commands and events only. No
  Tone objects, callbacks or refs cross it.
- **A song store** outside React (`useSyncExternalStore`) as the single source
  of truth for pads and loops. It has per-pad subscriptions, so a settings
  drag re-renders only what shows that pad.
- **`ToneEngine`**, which implements `Engine` for the web. Today's behavior is
  kept exactly: triggering, one-shot, auto-release at the end point, quantize,
  swing, mute/solo, metronome, the tuner and stems.
- **The engine owns live input.**
  - `press` and `release` replace the per-component refs in `DrumPad`,
    `PitchPad`, `SequencerPadButton` and `MidiContext`.
  - Recorded hits come back as a `hitRecorded` event, and the store commits
    them.
- **Playheads come from anchors, not polling.** The engine sends a transport
  anchor, and the UI works out the position from the anchor plus its own
  clock.
- **A C++ engine core** (`engine/core`), plain C++20 with no JUCE, mirroring
  the TS engine's rules, with unit tests.
- **A JUCE app** (`engine/juce`) that hosts the core and shows the web UI in a
  `WebBrowserComponent`, connected through a `JuceBridgeEngine` on the TS side.

## Non-goals

- Changing the saved song format. Backend and localStorage data stay
  compatible.
- Host tempo sync, multi-out buses, MIDI out to the DAW, and AAX. These come
  in the plugin phase.
- A WASM build of the C++ core. The core is kept Emscripten-friendly (no
  threads or file IO inside it), but no build is set up.
- UI redesign.

## Anti-goals

- **A boundary that leaks.** Any component that still imports `tone` for
  sound, or reaches into engine internals, defeats the purpose.
  - Allowed exceptions: Tone *types* and pure music-theory helpers such as
    note to frequency.
- **Behavior drift** on the web while refactoring. Every existing pure helper
  keeps its tests, and the engine reuses those helpers rather than
  re-deriving them.

## Architecture

```
React UI ── commands ──▶ Engine (ToneEngine | JuceBridgeEngine)
   ▲                          │
   │◀──────── events ─────────┘
   │
SongStore ──(sync: diff pads/loops)──▶ engine.send(setPad / setLoops)
```

### Song store (`src/lib/song/`)

- `createSongStore(initial)` returns a store with these parts:
  - `getState()` returns `{ samples, loops }`.
  - `subscribe(listener)`.
  - Intent-named actions: `setSamples`, `updateSamples(updater)`,
    `updatePad(id, updater)`, `setPadSettings(id, partial)`,
    `addEvent(id, loop, event)`, `setLoops`, `updateLoops(updater)`.
- Updates are immutable. Untouched pads keep their object identity.
- **Hooks:**
  - `useSongStore()` returns the store from context.
  - `usePad(id)`, `useAllSamples()` and `useLoops()` subscribe to it.
- **Persistence** (`persistSong(store)`) subscribes to the store and writes
  localStorage, debounced 500 ms, with a flush on `pagehide`.
  - This replaces the debounce in `SampleSettings` and the write effects in
    `AudioContext`.

### Engine protocol (`src/lib/engine/protocol.ts`)

Commands are sent from the UI to the engine:

| Command | Payload |
|---|---|
| `setPad` | `padId`, `pad` (url, settings, events) |
| `removePad` | `padId` |
| `setLoops` | `loops` |
| `setCurrentLoop` | `loop` |
| `play` / `stop` | — |
| `setRecording` | `on` |
| `setMetronome` | `on` |
| `press` | `padId`, `note` (resolved trigger note), `velocity` |
| `release` | `padId`, `note` |
| `setTunerPad` | `padId` or `null` |
| `previewSample` / `stopPreview` | `url` / — |

Events are sent from the engine to the UI:

| Event | Payload |
|---|---|
| `transport` | `playing`, `recording`, `loop`, `position` (s into loop), `loopDuration` (s) — sent on every state change and every loop wrap |
| `voiceStarted` / `voiceEnded` | `padId`, `note` |
| `hitRecorded` | `padId`, `loop`, `event` |
| `loading` | `pending` (number of pads still loading) |
| `padLoaded` | `padId`, `duration` |
| `padLoadFailed` | `padId`, `message` |
| `pitch` | `padId`, `frequency` or `null` |
| `previewStarted` / `previewEnded` | `url`, `duration` / `url` |

Requests that return a value are methods on the interface, not commands:

- `start()` unlocks audio, because browsers require a user gesture.
- `renderStem(padId, loop)` returns `{ sampleRate, channels: Float32Array[] }`
  or `null`.

All payloads are plain JSON values except `renderStem`'s result.

### Recording rule (engine-owned)

- **Press:**
  - Start the voice.
  - If the transport is playing and recording, store a pending hit
    `{ startTicks, note, velocity }`, keyed by `padId + note`.
- **Release:**
  - Apply `resolveRelease` as today.
  - If a pending hit exists:
    - fold its start with `wrapTicks`;
    - compute `duration` with `calcEventDuration`, which uses the pad's end
      point;
    - emit `hitRecorded`;
    - delete the pending entry.
- **One store commit per hit.** The store applies `addEvent`, and the
  resulting pad change syncs back to the engine.
- **Pressing a pad while it is already held** restarts the voice and replaces
  the pending hit. This matches today.

### Playheads

- **On every `transport` event** the UI stores
  `{ position, loopDuration, receivedAt: performance.now(), playing }`.
- **`currentPosition(anchor, now)`** is a pure function. It returns
  `(position + (now - receivedAt) / 1000) % loopDuration`.
  - Used by: loop progress bar, sequencer playhead, beat counter.
- **The waveform playhead** listens to `voiceStarted` / `voiceEnded` for the
  selected pad. It keeps the start moment and note, so the same math as today
  runs on the UI clock.

### ToneEngine (`src/lib/engine/tone/`)

- **`PadVoice`**: one per pad. It owns a `CustomSampler` and its FX chain (gain,
  pitch shift, high-pass, low-pass, pan/vol, analyser) and applies settings
  with `applySoundSettings`.
- **`LiveInput`**: the press/release state machine. It has no Tone dependency,
  takes an injected clock and timer, and is unit-tested.
- **Scheduling**: one `Tone.Part` per pad for the current loop. It is rebuilt
  when the pad's events, quantize settings, loop or play state change.
  Scheduled triggers emit `voiceStarted` / `voiceEnded` at audio time through
  `Tone.getDraw()`.
- **Mute/solo**: `computeGain` across all pads, applied by the engine.
- **Metronome and transport**: moved here from `Transport.tsx` and
  `AudioContext`.
- **IndexedDB caching**: moved here from `AudioContext`. It is a web-engine
  detail.
- **Stems**: built offline from the pad state the engine holds, reusing the
  same voice construction code.

### Engine selection

`EngineProvider` creates `JuceBridgeEngine` when `window.__JUCE__` exists, and
`ToneEngine` otherwise. It also wires store-to-engine sync, and routes
`hitRecorded` into `store.addEvent`.

### C++ core (`engine/core`)

- **Plain C++20 with no dependencies.** Tests use doctest, fetched by CMake.
- **Mirrors the TS rules:**
  - `wrapTicks`, `calcEventDuration`, `calcTriggerParams`, quantize, schedule
    building, `resolveRelease` and `computeGain` are ported as pure functions
    with the same test cases.
  - **DSP:**
    - Sampler voices: offset, reverse, playback rate from note, linear
      attack/release.
    - RBJ biquad filters, 12 dB/oct, the same as `Tone.Filter`'s default.
    - Equal-power pan and a volume in dB.
    - A delay-line pitch shifter, the same design as `Tone.PitchShift`.
- **`Engine` class**:
  - `handle(Command)`.
  - `process(float* const* out, int numChannels, int numFrames)`.
  - `takeEvents()`.
  - `stemJob(padId, loop)` plus the free `renderStem(job, sampleRate)`, so a
    host can render outside its lock.
- **Threading (v1):** the core is single-threaded.
  - The JUCE processor guards it with one mutex. The message thread locks it
    to apply commands.
  - The audio thread only tries the lock, and outputs one silent block if the
    lock is busy.
  - Commands still allocate (pad state, schedules), and events are pushed on
    the audio thread.
  - Moving to lock-free command and event queues is a follow-up.
- **The core never decodes files.** The host hands it decoded buffers with
  `setPadBuffer(padId, SampleBuffer)`.

### JUCE app (`engine/juce`)

- **CMake target `CitizenSampler`**, built as Standalone, AU and VST3, against
  the local JUCE 8 checkout at `~/code/JUCE`, or `JUCE_DIR`.
- **`AudioProcessor`**:
  - Owns the core engine.
  - Decodes pad URLs with `AudioFormatManager`, fetching http(s) through
    `juce::URL`, on a background thread.
  - Maps MIDI notes 36–51 to pads 1–16.
- **Editor**: a `WebBrowserComponent` with native integration.
  - `engineCommand(json)` is a native function.
  - Engine events go to the page as the `engineEvent` event.
  - The dev URL is `http://localhost:3000`.
  - Bundling the static UI is a follow-up.

## Calls I made (user asleep; review these)

1. The saved format is unchanged, including event `duration` in seconds and
   `startTime` in ticks. The C++ core uses the same units.
2. The store keeps the existing `SampleTypeFE` / `AllLoopSettingsFE` shapes.
   `AudioContext` stays as a thin facade over the store, so dialog components
   change little.
3. Pitch detection runs in the engine, which sends raw frequency. Smoothing
   stays in `usePitchDetector`.
4. Sample preview in `ChooseSample` goes through the engine. Waveform peaks are
   decoded UI-side, as `Waveform` already does.
5. `JuceBridgeEngine.renderStem` sends the request through the bridge. Writing
   stems to disk natively is deferred.
6. The plugin's MIDI note map, 36–51 for pads 1–16, is a placeholder.

## Status (end of first pass)

Built on this branch:

- **Web: song store, engine protocol and view, live input, ToneEngine and
  JuceBridgeEngine.** Components now use engine commands and store hooks.
  - The web build has no Tone nodes or `samplersRef` outside
    `lib/engine/tone`.
  - Smoke-tested in Chrome: loading, pad hits, recording, playback, the
    sequencer playhead, sample preview and a settings slider.
- **C++ core with 68 doctest cases.** The rule tests port the TypeScript
  cases.
- **JUCE app: Standalone, AU and VST3 build.** The standalone app ran against
  the dev UI. The UI's commands reached the engine, and all 16 pads loaded
  through `SampleLoader`.

### Deviations from Tone.js in the C++ engine

- **Pitch shift:**
  - 0 semitones bypasses it. Tone adds a fixed delay and comb filtering
    there.
  - Other values shift by the exact ratio. Tone's formula scales the shift by
    1.2, and is odd for negative values.
- **Fades:** attack and release fades are linear. Tone's sampler uses its
  "exponential" curve.
- **Recording position:** a live press records the transport position
  without Tone's 0.1 s look-ahead. The sound also starts without look-ahead,
  so recording and playback stay consistent.

### Behavior changes on the web

- **Hit length:** a recorded hit's duration is the time from press to release
  on the transport's seconds clock.
  - Before, the start was read in ticks and the release in seconds. The two
    can round differently, so a very short tap could be saved as a
    whole-loop hit.
  - The old cap at the sample end point compared a loop position with a
    sample position. It is gone; playback already caps each hit at the
    sample's length.
- **MIDI highlight:** a pad stays lit while its MIDI key is held, not only
  while its sound plays.

### Follow-ups

- **Release rules:** the C++ engine releases every voice of a note on a pad,
  while Tone's sampler releases one source. Overlapping hits on the same note
  can cut differently in the two engines.

- **Tuner:** the C++ engine needs pitch detection (FFT). `setTunerPad` is a
  no-op there today.
- **Session state:** the plugin restores its saved pads and loops into the
  engine, but the UI still loads its song from localStorage. The UI needs a
  `songRestored` event, or a request for the host's song, so a DAW session
  and the UI agree.
- **UI bundling:** the WebView loads a dev server. Ship the static export
  (`next build` already prerenders `/` as static) through a JUCE resource
  provider.
- **Plugin features:** multi-out buses, host tempo and transport sync, MIDI
  out and AAX.
- **Real-time safety:** lock-free command and event queues (see Threading).
- **Validation:** run `auval` and the VST3 validator. These install into the
  user's plugin folders, so they weren't run unattended.
- **Waveform:** `Waveform` and `AudioSnippetVisualizer` still decode audio in
  the UI for peaks. That works in the WebView, but downloads each sample
  twice in the desktop app.
