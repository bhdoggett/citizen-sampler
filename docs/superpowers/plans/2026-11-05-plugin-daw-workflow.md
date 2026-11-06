# Plugin DAW Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AU/VST3 plugin a DAW instrument: kit or per-pad chromatic MIDI depending on the output layout, 16 per-pad outputs, a sequencer that follows host tempo and never plays during host playback, MIDI export of patterns, and no accounts in the plugin.

**Architecture:** The C++ engine core gains a pad layout (kit / multi-out), MIDI note mapping, per-pad output rendering and a host state (tempo, playing). The JUCE processor declares 16 stereo output buses, reads the host playhead each block and feeds MIDI to the engine. A new `hostContext` event tells the React UI it is in a plugin, which layout it has, the host tempo and whether the host is playing; the UI gates transport, BPM, pitch grid and account menus on it. One TypeScript MIDI file builder serves the web download and the plugin's native save/drag.

**Tech Stack:** C++20, JUCE 8, CMake + Ninja, doctest; Next.js/React, TypeScript, CSS modules, vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-plugin-daw-workflow-design.md`

## Global Constraints

- Plugin IDs, `PLUGIN_CODE CtSm`, `PLUGIN_MANUFACTURER_CODE Dgsy`, `BUNDLE_ID` and the saved state format never change. Pre-change sessions load as stereo/kit and sound the same.
- Kit layout: notes 36–51 (C1–D#2) on any channel play pads 1–16 at their own pitch.
- Multi-out layout: MIDI channel N plays `pad-N`; pad N renders to stereo bus N only; no full-mix bus.
- Chromatic notes are transposed against the pad's `baseNote` exactly like `resolvePlayNote` (`frontend-next/src/lib/audio/util/resolvePlayNote.ts`): played note + (60 − midi(baseNote)).
- Plugin pattern never sounds while the host plays: host play stops it, plugin Play/Record ignored while host plays.
- In the plugin, host tempo overrides loop BPM at runtime only; stored `LoopTiming.bpm` is untouched.
- `NEEDS_MIDI_OUTPUT` stays `FALSE`. No plugin MIDI output.
- Audio thread: no allocation in `processBlock`, keep the existing `try_lock` pattern.
- Frontend: TypeScript, CSS modules with tokens; no inline styles.
- Web app and standalone app sequencer behavior unchanged, apart from the web MIDI download.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Old session restore** — a pad JSON with no `baseNote` loads as C4 and plays exactly as before. Test in Task 2.
2. **MIDI for an empty pad or out-of-range note** — channel 7 note-on when `pad-7` has no sample, kit note 35 or 52, chromatic note 0 or 127: no sound or crash, nothing recorded. Tests in Task 3.
3. **Host tempo change while the plugin pattern plays** — position stays inside the new loop length and hits keep firing. Test in Task 5.
4. **Host stops** — host playing true→false never starts the plugin pattern. Test in Task 5.
5. **Export of an empty loop or note-off/note-on at the same tick** — empty loop gives `null` (button disabled); same-pitch note-off sorts before note-on at equal ticks. Tests in Task 7.

---

### Task 1: Spike — Logic layout detection, drag-out, multi-timbral channels (throwaway)

Throwaway branch `bhdoggett/spike-daw-drag`. No tests. Needs the user to run Logic; report results back before Task 6 and Task 9.

**Files (spike only, not merged):** `engine/juce/PluginProcessor.{h,cpp}`, `engine/juce/PluginEditor.cpp`, `engine/juce/CMakeLists.txt`.

- [ ] **Step 1:** Declare 16 stereo output buses (bus 1 "Pad 1" enabled, buses 2–16 "Pad 2".."Pad 16" disabled by default). `isBusesLayoutSupported` accepts: main mono or stereo with every other bus disabled, or all 16 buses stereo. In `prepareToPlay`, `DBG`/stderr-log the enabled output bus count and channel sets.
- [ ] **Step 2:** Add native function `spikeDrag` that writes a hard-coded 1-bar `.mid` (two tracks/channels) to a temp file and calls `juce::DragAndDropContainer::performExternalDragDropOfFiles({path}, false, editor)`. Call it from a temporary `mousedown` handler in the UI (dev server).
- [ ] **Step 3:** Build AU, copy to `~/Library/Audio/Plug-Ins/Components`, ask the user to check in Logic and record answers:
  1. Inserting as Stereo vs Multi-Output (16xStereo): does the logged bus count differ? (If not, layout detection needs a fallback: a plugin "16 outs" toggle saved in state. Write that into Task 6 before starting it.)
  2. Does the drag land as a MIDI region on a track?
  3. On a multi-timbral track, does the region keep per-event channels? Does a multi-track `.mid` drop create one region per track?
- [ ] **Step 4:** Record results in the spec under "Risk: drag-out" (and a new line for layout detection). Commit the spec change only, on the feature branch. Delete the spike branch.

---

### Task 2: Core — note names and `baseNote`

**Files:**
- Modify: `engine/core/include/citizen/Notes.h`, `engine/core/src/Notes.cpp`
- Modify: `engine/core/include/citizen/Types.h` (`SampleSettings`)
- Modify: `engine/juce/Wire.cpp` (`parseSettings`)
- Test: `engine/tests/NotesTest.cpp`, `engine/juce/tests/WireTest.cpp`

**Interfaces:**
- Produces: `std::string midiToNote(int midi);` — sharps, Tone spelling ("C4"=60, "C#4"=61, "C-1"=0). `SampleSettings::baseNote` (`std::string`, default `"C4"`).

- [ ] **Step 1: Failing tests**

```cpp
TEST_CASE("midiToNote spells notes like Tone") {
    CHECK(midiToNote(60) == "C4");
    CHECK(midiToNote(61) == "C#4");
    CHECK(midiToNote(36) == "C1");
    CHECK(midiToNote(0) == "C-1");
    CHECK(noteToMidi(midiToNote(127)) == 127);
}
// WireTest.cpp
TEST_CASE("pad settings without baseNote default to C4") { /* parse setPad JSON with no baseNote → settings.baseNote == "C4" */ }
TEST_CASE("pad settings read baseNote") { /* "baseNote":"A3" → "A3" */ }
```

- [ ] **Step 2:** Run `cmake --build engine/build && engine/build/tests/citizen_core_tests -tc="midiToNote*"` — FAIL (undefined). Wire: `cmake --build engine/build-juce --target CitizenWireTests && engine/build-juce/juce/CitizenWireTests_artefacts/CitizenWireTests -tc="*baseNote*"` — FAIL.
- [ ] **Step 3:** Implement `midiToNote`; add `baseNote` to `SampleSettings`; in `parseSettings` set it when `json["baseNote"]` is a string that `noteToMidi` parses, else keep `"C4"`.
- [ ] **Step 4:** Both commands PASS, full suites pass.
- [ ] **Step 5:** Commit `Add midiToNote and read the pad's base note in the engine`.

---

### Task 3: Core — pad layout and MIDI note mapping

**Files:**
- Modify: `engine/core/include/citizen/Types.h`, `engine/core/include/citizen/Engine.h`, `engine/core/src/Engine.cpp`
- Test: `engine/tests/EngineTest.cpp`

**Interfaces:**
- Consumes: `midiToNote`, `SampleSettings::baseNote` (Task 2).
- Produces:
  - `enum class PadLayout { Kit, MultiOut };` in `Types.h`
  - `inline constexpr int kPadCount = 16;` and `std::optional<int> padNumber(const std::string& padId);` (`"pad-7"` → 7, anything else or outside 1–16 → nullopt) in `Types.h` / `Engine.cpp`
  - `void Engine::setPadLayout(PadLayout layout);` `PadLayout Engine::padLayout() const;`
  - `void Engine::midiNoteOn(int channel, int note, double velocity);` `void Engine::midiNoteOff(int channel, int note);` — channel 1–16.

Mapping: Kit — note 36–51 → `pad-(note-35)`, trigger note `"C4"`, channel ignored. MultiOut — channel N → `pad-N`, trigger note `midiToNote(note + 60 - midi(baseNote))`. Both go through `live_->press/release`, so voices, `VoiceStarted` events and recording behave as UI presses. Note-off must release the same pad+trigger note the note-on used: keep a fixed-size `std::array<std::optional<std::pair<std::string,std::string>>, 16*128>` keyed by channel×note (no allocation on the audio thread beyond what `press` already does).

Kit layout pitched presses: in `PadLayout::Kit`, a `cmd::Press` (or MIDI) whose note is not `"C4"` sounds but is not recorded (no `HitRecorded`). Implement by making `recordingPosition`/`isRecording` return nothing for that press (e.g. a `suppressRecording_` flag set around the `live_->press` call).

- [ ] **Step 1: Failing tests**

```cpp
TEST_CASE("kit layout maps notes 36-51 to pads 1-16 on any channel") {
    Rig rig; rig.addPad("pad-1"); rig.addPad("pad-16");
    rig.engine.midiNoteOn(5, 36, 1.0); rig.engine.midiNoteOn(1, 51, 1.0); rig.run(0.01);
    auto started = rig.eventsOf<evt::VoiceStarted>();
    REQUIRE(started.size() == 2);
    CHECK(started[0].padId == "pad-1"); CHECK(started[0].note == "C4");
    CHECK(started[1].padId == "pad-16");
}
TEST_CASE("kit layout ignores notes outside 36-51") { /* 35 and 52 → no VoiceStarted */ }
TEST_CASE("multi-out maps channel to pad and transposes against baseNote") {
    // pad-3 baseNote "A3" (57): MIDI 57 on ch 3 → note "C4"; MIDI 59 → "D4"
}
TEST_CASE("multi-out note-off releases the note the note-on started") { /* change baseNote between on/off, voice still ends */ }
TEST_CASE("MIDI for a pad with no sample is silent and records nothing") { /* ch 7, no pad-7; recording on → no events, no crash */ }
TEST_CASE("extreme chromatic notes do not crash") { /* ch 1 notes 0 and 127, run 0.1 s */ }
TEST_CASE("kit layout does not record pitched presses") {
    // playing + recording, Press{"pad-1","D4"} then release → no HitRecorded; Press{"pad-1","C4"} → one HitRecorded
}
TEST_CASE("multi-out records pitched presses") { /* same Press D4 → HitRecorded with note "D4" */ }
```

- [ ] **Step 2:** `engine/build/tests/citizen_core_tests -tc="*layout*,*MIDI*,*chromatic*"` — FAIL (no members).
- [ ] **Step 3:** Implement per the Interfaces block.
- [ ] **Step 4:** Tests PASS, full core suite passes.
- [ ] **Step 5:** Commit `Map MIDI to pads by layout: kit notes or one chromatic pad per channel`.

---

### Task 4: Core — per-pad output rendering

**Files:**
- Modify: `engine/core/include/citizen/Engine.h`, `engine/core/src/Engine.cpp` (`process`)
- Test: `engine/tests/EngineTest.cpp`

**Interfaces:**
- Consumes: `PadLayout`, `padNumber` (Task 3).
- Produces: `Engine::process(out, numChannels, numFrames)` keeps its signature. In `PadLayout::MultiOut` with `numChannels >= 2 * kPadCount`, channels `2(N-1)` and `2(N-1)+1` carry `pad-N` only. Metronome clicks and sample preview mix into channels 0–1 (designer's call: auditioning goes to the first output). Pads whose id has no `padNumber` are silent in MultiOut. Any other channel count falls back to today's mix behavior.

Approach: per pad, zero the destination slice and call `channel.process(destL, destR, n)` directly into the host buffer (it adds), no extra mix buffers.

- [ ] **Step 1: Failing tests**

```cpp
TEST_CASE("multi-out renders each pad to its own channel pair") {
    // pad-1 and pad-3, constant buffers; 32-channel output; press both
    // → ch 0/1 non-zero, ch 4/5 non-zero, ch 2/3 and 6..31 all zero
}
TEST_CASE("multi-out sends preview to the first pair") { /* setPreviewBuffer, ch 0 non-zero, ch 2 zero */ }
TEST_CASE("kit layout with 32 channels still mixes into the first pair") { /* back-compat */ }
```

- [ ] **Step 2:** Run `-tc="multi-out*,kit layout with*"` — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** PASS + full suite.
- [ ] **Step 5:** Commit `Render each pad to its own output pair in the multi-out layout`.

---

### Task 5: Core — host state and `hostContext` event

**Files:**
- Modify: `engine/core/include/citizen/Protocol.h`, `engine/core/include/citizen/Engine.h`, `engine/core/src/Engine.cpp`
- Modify: `engine/juce/Wire.cpp` (`toJson`)
- Test: `engine/tests/EngineTest.cpp`, `engine/juce/tests/WireTest.cpp`

**Interfaces:**
- Produces:
  - `struct HostState { bool isPlugin = false; std::optional<double> tempo; bool playing = false; };`
  - `void Engine::setHost(const HostState& host);` — called every block by the processor.
  - `void Engine::emitHostContext();` — queues the current context (used when an editor opens).
  - `evt::HostContext { bool isPlugin; PadLayout layout; std::optional<double> tempo; bool hostPlaying; }` added to `Event`.
  - Wire JSON: `{"type":"hostContext","isPlugin":bool,"layout":"kit"|"multiOut","tempo":number|null,"hostPlaying":bool}`.

Behavior:
- `timing(loop)` returns the stored timing with `bpm` replaced by `host.tempo` when `isPlugin && tempo`. `stemJob` uses the same override.
- Tempo change (|Δ| > 1e-6): rebuild schedules and `fmod` position into the new loop length.
- Host playing false→true while `playing_`: `stop()` (ends recording too).
- `cmd::Play` and `cmd::SetRecording{true}` are ignored while host playing.
- Emit `HostContext` when any field changes (including `setPadLayout`), never every block.

- [ ] **Step 1: Failing tests**

```cpp
TEST_CASE("host tempo overrides loop bpm in a plugin") { /* setHost{true, 60.0, false}; Transport loopDuration == 8 s (was 4 s at 120) */ }
TEST_CASE("host tempo is ignored outside a plugin") { /* isPlugin false → 4 s */ }
TEST_CASE("host tempo change while playing keeps position inside the loop") { /* play, run 3.5 s, setHost tempo 240 (2 s loop), run 0.1 s → last Transport position < 2.0, hits still fire */ }
TEST_CASE("host starting playback stops the plugin pattern") { /* play + recording, setHost playing true → Transport playing false, recording false */ }
TEST_CASE("plugin play is ignored while the host plays") { /* setHost playing, Play → still not playing */ }
TEST_CASE("host stopping does not start the plugin pattern") { /* playing true→false → still stopped */ }
TEST_CASE("hostContext is emitted on change only") { /* setHost same state twice → one HostContext; tempo change → second */ }
// WireTest: hostContext JSON shape, tempo null when unset
```

- [ ] **Step 2:** Run tests — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** PASS, both suites.
- [ ] **Step 5:** Commit `Follow the host's tempo and keep the plugin pattern quiet while the host plays`.

---

### Task 6: JUCE — buses, layout, playhead, MIDI

Apply Task 1's findings first: if Logic does not reveal the layout through enabled buses, add a "16 outs" toggle saved in plugin state and use it instead of the bus count (state key `"layout"`, absent = kit).

**Files:**
- Modify: `engine/juce/PluginProcessor.h`, `engine/juce/PluginProcessor.cpp`

**Interfaces:**
- Consumes: `Engine::setPadLayout`, `midiNoteOn/Off`, `setHost`, `emitHostContext`, `process` (Tasks 3–5).

Steps of behavior:
- Constructor buses: output bus "Pad 1" stereo enabled, "Pad 2".."Pad 16" stereo disabled. `isBusesLayoutSupported`: main mono/stereo with all others disabled, or all 16 stereo.
- `prepareToPlay` and `processorLayoutsChanged()`: layout = MultiOut when all 16 output buses are enabled, else Kit; `engine_.setPadLayout(...)` under the lock.
- `processBlock`: read `getPlayHead()->getPosition()` (`getBpm()`, `getIsPlaying()`); `engine_.setHost({wrapperType != wrapperType_Standalone, bpm, playing})`. Replace the current MIDI loop with `midiNoteOn(message.getChannel(), note, velocity)` / `midiNoteOff`. Pass all output channels to `engine_.process`.
- `createEditor`: call `engine_.emitHostContext()` under the lock before returning the editor.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `cmake --build engine/build-juce --target CitizenSampler_AU CitizenSampler_VST3 CitizenSampler_Standalone` — builds with no new warnings.
- [ ] **Step 3:** `auval -v aumu CtSm Dgsy` — PASS.
- [ ] **Step 4:** Commit `Offer 16 stereo outputs and feed host tempo, transport and MIDI to the engine`.

---

### Task 7: TypeScript — `hostContext` in the protocol and view; MIDI file builder

**Files:**
- Modify: `frontend-next/src/lib/engine/protocol.ts`, `frontend-next/src/lib/engine/view.ts`, `frontend-next/src/lib/engine/react.tsx`
- Create: `frontend-next/src/lib/midi/buildMidiFile.ts`
- Test: `frontend-next/src/lib/engine/view.test.ts`, `frontend-next/src/lib/midi/buildMidiFile.test.ts`

**Interfaces:**
- Produces:
  - `type HostContext = { isPlugin: boolean; layout: "kit" | "multiOut"; tempo: number | null; hostPlaying: boolean }`; `EngineEvent` gains `{ type: "hostContext" } & HostContext`.
  - `EngineViewState.host: HostContext` (initial `{ isPlugin: false, layout: "kit", tempo: null, hostPlaying: false }`).
  - Hooks: `useHostContext(): HostContext`.
  - `type MidiExportUnit = { kind: "kit" } | { kind: "pad"; padId: string }`
  - `buildMidiFile(input: { samples: Samples; loop: LoopName; loopSettings: LoopSettingsFE; bpm: number; layout: "kit" | "multiOut"; unit: MidiExportUnit; fallbackDuration: (padId: string) => number }): { bytes: Uint8Array; droppedPitch: boolean } | null`

Builder rules (from the spec):
- SMF format 1, PPQ 192, one tempo meta event (`bpm`), time signature `beats/4`.
- Event tick = `startTime` + swing offset, where offset = `(192/3) * sin(progress·π) * swing`, `progress = (round(t) mod 192)/192`, 0 on the beat — the same rule as `swingOffsetSeconds` in `engine/core/src/Rules.cpp`.
- Length in ticks = `duration` seconds × `bpm/60` × 192; `null` duration uses `fallbackDuration(padId)` seconds.
- Velocity = `round(velocity × 127)`, clamped 1–127.
- Kit layout: note = 35 + pad number, channel 1; any event whose note ≠ "C4" exports at the kit note and sets `droppedPitch: true`.
- Multi-out layout: channel = pad number; note = midi(event.note) − (60 − midi(baseNote)) (inverse of `resolvePlayNote`). `kind: "kit"` writes one track per pad (pending Task 1 answer 3 — if Logic re-channels, keep one track per pad; else a single track is acceptable).
- Mute/solo ignored (export what is written). No events → `null`.
- At equal ticks, note-off before note-on.

- [ ] **Step 1: Failing tests** — `view.test.ts`: a `hostContext` event updates `state.host`. `buildMidiFile.test.ts`, parsing bytes with a small local SMF reader helper in the test:
  - kit export of pad-1 hit at tick 0, duration 0.25 s at 120 bpm → note 36, ch 1, length 96 ticks
  - pitched event "D4" in kit layout → note 36, `droppedPitch === true`
  - multi-out, pad-3 baseNote "A3", event note "C4" → ch 3, note 57
  - swing 0.5, event at tick 96 → tick 96 + round(64 × 0.5) = 128
  - empty loop → `null`
  - two hits same pitch, first ends at tick 96, second starts at 96 → off precedes on
  - tempo meta encodes 500000 µs/qn at 120 bpm
- [ ] **Step 2:** `pnpm --dir frontend-next exec vitest run src/lib/midi src/lib/engine/view.test.ts` — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** PASS; `pnpm --dir frontend-next exec tsc --noEmit` clean.
- [ ] **Step 5:** Commit `Add the hostContext event and a MIDI file builder for loops`.

---

### Task 8: UI — plugin gating (transport, BPM, pitch grid, accounts)

**Files:**
- Modify: `frontend-next/src/components/Audio/Transport.tsx`, `frontend-next/src/components/Audio/Loop.tsx`, `frontend-next/src/components/Audio/PitchGrid.tsx` (+ `PitchGrid.module.css`), `frontend-next/src/components/MainMenu.tsx`
- Test: co-located `*.test.tsx` (create `Transport.test.tsx`, `PitchGrid.test.tsx`, `MainMenu.test.tsx` as needed)

**Interfaces:**
- Consumes: `useHostContext()` (Task 7).

Behavior:
- `Transport`: when `host.hostPlaying`, Play and Record buttons are `disabled` with title "Stopped while your DAW plays"; Space and Ctrl+R do nothing.
- `Loop.tsx` BPM input: when `host.isPlugin && host.tempo !== null`, shows `host.tempo` rounded to 2 decimals, `readOnly`, title "Follows your DAW's tempo". Stored BPM is not written.
- `PitchGrid`: when `host.isPlugin && host.layout === "kit"`, add a greyed class and a note: "Pitched notes need the 16-output layout. In mono or stereo, each MIDI note plays a different pad." Pads stay clickable (audition).
- `MainMenu`: when `host.isPlugin`, hide Login, Save Song, Save As, Load Song. Load Collection and Download Stems stay.
- `MainMenu`'s `verifyLogin` effect skips `checkLogin` when `host.isPlugin`.

- [ ] **Step 1: Failing tests** — render each with a fake `EngineProvider` whose view state has the host context: disabled play/record while host plays; BPM read-only showing 97.5; pitch grid note present in plugin kit, absent in multi-out and web; account items hidden in plugin, present on web.
- [ ] **Step 2:** `pnpm --dir frontend-next exec vitest run src/components` — new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** PASS; `tsc --noEmit` clean.
- [ ] **Step 5:** Commit `Hide accounts and gate transport, tempo and pitch grid in the plugin`.

---

### Task 9: MIDI export — web download, plugin save and drag

Shape the drag part by Task 1 answer 2: if WebView drag failed, skip `dragMidi` and ship the Export button only.

**Files:**
- Create: `frontend-next/src/components/Audio/StepSequencer/MidiExport.tsx` (+ `.module.css`, `.test.tsx`)
- Modify: `frontend-next/src/components/Audio/StepSequencer/SequencerControls.tsx` (kit export), `frontend-next/src/components/Audio/StepSequencer/SequencerRow.tsx` (per-pad export)
- Modify: `frontend-next/src/lib/engine/protocol.ts` (`Engine` interface), `frontend-next/src/lib/engine/juce/juceBridgeEngine.ts`, `frontend-next/src/lib/engine/tone/toneEngine.ts`
- Modify: `engine/juce/PluginEditor.cpp`

**Interfaces:**
- Consumes: `buildMidiFile`, `MidiExportUnit`, `useHostContext` (Task 7).
- Produces:
  - `Engine.saveMidi(fileName: string, bytes: Uint8Array): Promise<void>` — Tone: browser download via Blob + anchor. JUCE: native function `saveMidi(fileName, base64)` writes `~/Music/Citizen Sampler/MIDI/<fileName>` (unique-suffixed if it exists) and calls `revealToUser()`.
  - `Engine.dragMidi?(fileName: string, bytes: Uint8Array): void` — JUCE only: native `dragMidi(fileName, base64)` writes to `juce::File::getSpecialLocation(tempDirectory)/Citizen Sampler/<fileName>` and calls `performExternalDragDropOfFiles`. Temp files older than one day are deleted when the editor opens.
  - File names: `<song title or "citizen-sampler">-loop-<A..D>[-pad-N].mid`.
  - `<MidiExport unit={MidiExportUnit} />`: an Export button (disabled when `buildMidiFile` returns `null`) and, when `engine.dragMidi` exists, a drag handle that calls it on `pointerdown`+move. BPM = `host.tempo` in the plugin, else the loop BPM. Layout = `host.layout` in the plugin, `"multiOut"` on web/standalone (keeps pitch). When `droppedPitch`, show "Pitch dropped: kit layout plays each pad at its own pitch."

- [ ] **Step 1: Failing tests** — `MidiExport.test.tsx` with a fake engine: Export calls `saveMidi` with the expected file name and non-empty bytes; button disabled on an empty loop; drag handle absent when `dragMidi` undefined; pitch-dropped note shown for a pitched pattern in plugin kit layout.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement TS side, then native functions in `PluginEditor.cpp` (base64 via `juce::MemoryBlock::fromBase64Encoding`).
- [ ] **Step 4:** vitest PASS, `tsc --noEmit` clean, `cmake --build engine/build-juce --target CitizenSampler_AU` builds.
- [ ] **Step 5:** Commit `Export loops as MIDI: download on the web, save or drag in the plugin`.

---

### Task 10: Logic checklist and app icon

**Files:** `engine/juce/CMakeLists.txt`, `engine/juce/assets/app-icon.{svg,png}` (already in the working tree).

- [ ] **Step 1:** Commit the icon: `git add engine/juce/CMakeLists.txt engine/juce/assets && git commit` — `Give the desktop app and plugins the web favicon as their icon`.
- [ ] **Step 2:** Run the full pre-push checks: `.githooks/pre-push` equivalents (frontend tsc + vitest, core tests, wire tests). All pass.
- [ ] **Step 3:** Hand the user this Logic checklist and record results in the PR:
  1. Insert as Stereo: C1–D#2 play pads; pitch grid greyed with note; BPM shows Logic tempo.
  2. Insert as Multi-Output (16xStereo), add 16 multi-timbral tracks: track N plays pad N chromatically; each pad on its own aux only.
  3. Plugin pattern plays from plugin Play while Logic is stopped; pressing Logic Play stops it and disables plugin Play/Record.
  4. Change Logic tempo: plugin loop speed follows.
  5. Drag (or Export) a kit pattern and a pad part into Logic; regions play back through the plugin matching the sketch, swing included.
  6. Login/Save/Load hidden in the plugin; still present in the standalone app.
  7. Open a project saved before this branch: same sound, stereo/kit.
  8. App icon in Dock and Finder matches the web favicon.

---

### Task 11: Plugin window — smaller, resizable, UI fills it (added mid-run at the user's request)

User feedback from Logic: the window is too big, too much grey background around the UI, and it should be resizable. The web frame is a fixed 800px wide (`frontend-next/src/app/page.module.css` `.frame`), while the editor opens at 1280×820.

**Files:**
- Modify: `engine/juce/PluginEditor.cpp` (size, limits, aspect ratio)
- Modify: `frontend-next/src/app/page.tsx`, `frontend-next/src/app/page.module.css`
- Create: `frontend-next/src/lib/useFitToWindow.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `hasJuceBackend()` (`frontend-next/src/lib/engine/juce/juceBridgeEngine.ts`).
- Produces: `useFitToWindow(ref: RefObject<HTMLElement>, enabled: boolean): number` — returns the scale that fits the element's natural size (measured unscaled) inside the window, minus the outer margin; re-computes on `resize`.

Behavior:
- In JUCE builds (`hasJuceBackend()`), `.page` uses a minimal outer margin (`var(--space-2)`), the frame is scaled with CSS `zoom` set through a CSS custom property (`--fit-scale`) on the frame's class — no inline style objects beyond setting that one variable via `style.setProperty` in the hook's effect — and the footer credit stays, compact, directly under the frame.
- The web build is unchanged (hook disabled).
- Editor: default size = the frame's natural size at scale 1 plus margins (measure in the Standalone; about 860×700 expected), `setResizable(true, true)`, fixed aspect ratio from that default (`getConstrainer()->setFixedAspectRatio`), limits 60%–200% of the default.

- [ ] **Step 1: Failing test** — `useFitToWindow.test.ts`: element natural 800×600, window 400×300 minus margin → scale ≈ 0.5 − margin effect; window 1600×1200 → ≈ 2; disabled → 1; resize event recomputes.
- [ ] **Step 2:** Run `pnpm --dir frontend-next exec vitest run src/lib/useFitToWindow.test.ts` — FAIL.
- [ ] **Step 3:** Implement hook, page wiring, CSS, and editor sizing.
- [ ] **Step 4:** vitest + `tsc --noEmit` pass; Standalone builds; open the Standalone, drag the corner from smallest to largest: no clipping, no sideways scroll, grey border stays thin. Screenshot smallest and default into the report.
- [ ] **Step 5:** Commit `Fit the UI to a smaller, resizable plugin window`.
