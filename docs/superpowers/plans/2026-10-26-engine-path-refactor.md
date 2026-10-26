# Engine-Path TPP Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the audio rules in `frontend-next/` pure, single-sourced, and free of hidden transport reads. This prepares a later `AudioEngine` extraction and a C++ port.

**Architecture:** Each rule moves into a small pure function under `lib/audio/`. The function takes all its inputs as parameters and has a Vitest test. React code calls these functions and no longer re-derives the rules inline. The `AudioEngine` extraction (audit item 1) is **not** in this plan. It gets its own plan after these tasks land, because its interface depends on what these tasks produce.

**Tech Stack:** Next 16, React, TypeScript, Tone.js, Vitest (`src/test/toneMock.ts` mocks Tone).

**Spec:** `docs/tpp-refactor-audit.md`, the refreshed version verified against `main` @ 744c18e3. It covers items 2a, 3.3, 3.1, 3.2, 2b/3.5, 3.4 and 2f, and the `applySamplerSettings` stale closure.

## Global Constraints

- All paths are relative to `frontend-next/src/` unless noted.
- Run commands from `frontend-next/`.
- After every task, `pnpm test` and `npx tsc --noEmit` must pass, and `npx eslint .` must show no new errors. The 3 existing `react-hooks/refs` warnings in `SampleSettings.tsx` are allowed until Task 7.
- Commits follow the repo's style: imperative, sentence-case subject, no `feat:` prefix. Each commit body names the TPP principle it applies.
- Pure functions in `lib/audio/` must not import `tone`, except for type-only imports.
- Do not touch the user's own audit items:
  - 2c (localStorage owners)
  - 2d (dialogs)
  - `hotKeysActive` and `isSelected` from 2e
  - 3.6–3.12
  - the broken windows other than the stale closure and the unused `PitchGrid` `sampler` prop
- **The owner's decision on mute and solo:** they are mutually exclusive. Turning solo on turns mute off, and turning mute on turns solo off.
- **The planner's call:** when saved data has both flags on, solo wins and mute is cleared.
- **Manual check after Tasks 1, 2, 4, 5 and 6:** run `pnpm dev`. With quantize on, record pad hits while the loop plays, play them back, switch loops A to B, and export stems. Audio has no automated coverage.

## Review Focus

1. **Loop switching during playback.** Bpm, swing, beats and bars must follow the new loop immediately, with no tempo glitch from two writers. Task 5 adds an `applyLoopSettings` test, and the manual check covers it.
2. **Holding a pad across the loop wrap while recording.** The duration must wrap (`loopEnd - start + release`). Task 1 keeps that test with explicit timing.
3. **Old saved songs with both mute and solo set.** These must load as soloed, not muted. Task 3 adds a `normalizeMuteSolo` test.
4. **Lowpass value `0` in saved data.** It must stay `0`, not become 200 Hz or 20 kHz. Task 4 adds a test that `applySoundSettings` uses `??`, not `||`.
5. **A sampler swapped by ChooseSample, KitMenu, CollectionMenu or LoadSong.** It must get the current mute and solo gain, not stale closure data. Task 4 adds a `samplers` state dependency to the gain effect, and the manual check covers it.

---

### Task 1: Pure timing utils (audit 2a)

**Files:**
- Create: `lib/audio/util/timing.ts`
- Modify: `lib/audio/util/quantize.ts`, `lib/audio/util/getScheduleEvents.ts`, `lib/audio/util/calcEventDuration.ts`, `components/Audio/PitchPad.tsx`, `components/Audio/DrumPad.tsx`, `app/contexts/MidiContext.tsx`
- Test: `lib/audio/util/timing.test.ts`, `quantize.test.ts`, `getScheduleEvents.test.ts`, `calcEventDuration.test.ts`

**Interfaces:**
- Produces:
  - `export type LoopTiming = { bpm: number; beats: number; bars: number }`, moved from `getScheduleEvents.ts` to `timing.ts`. `LoopSettingsFE` is assignable to it.
  - `export const PPQ = 192`. This is Tone's default. Nothing in the app changes it.
  - `export function ticksToSeconds(ticks: number, bpm: number): number`
  - `export function loopDurationSeconds(timing: LoopTiming): number`, which returns `bars * beats * 60 / bpm`
  - `quantize(time: number, quantVal: string, bpm: number): number`, with `bpm` now required
  - `getScheduleEvents(allSampleData, id, currentLoop, timing: LoopTiming)`, with `timing` now required. Loop start is always 0.
  - `calcEventDuration(startTicks: number, releaseTime: number, timing: LoopTiming, sampleEnd?: number | null): number`

- [ ] **Step 1: Write the failing tests**
  - `timing.test.ts`:
    - `ticksToSeconds(192, 120)` equals `0.5`
    - `ticksToSeconds(192, 60)` equals `1`
    - `loopDurationSeconds({ bpm: 120, beats: 4, bars: 2 })` equals `4`
    - `loopDurationSeconds({ bpm: 60, beats: 3, bars: 1 })` equals `3`
  - `quantize.test.ts`:
    - Pass `120` explicitly in every existing case.
    - Delete "follows the transport tempo". It tests the global fallback that this task removes.
  - `getScheduleEvents.test.ts`:
    - Pass `{ bpm: 120, beats: 4, bars: 2 }` in the top-level cases, keeping their expected values.
    - Remove `resetTransport` and the `vi.mock("tone")` line, because the function no longer touches Tone.
  - `calcEventDuration.test.ts`:
    - Replace `transport.seconds = X` with the `releaseTime` argument.
    - Pass `{ bpm: 120, beats: 4, bars: 2 }` as the timing.
    - Keep the three cases and their expected values `1`, `0.75` and `1`.

- [ ] **Step 2: Run the tests to verify they fail**
  - Run: `pnpm test lib/audio/util`
  - Expected: FAIL. `timing` has no exports yet, and the signature changes break the other tests.

- [ ] **Step 3: Implement**
  - Write `timing.ts`.
  - Remove `import * as Tone` from `quantize.ts`, `getScheduleEvents.ts` and `calcEventDuration.ts`. Keep a type-only import where `Tone.Unit.Frequency` is used.
  - Update the callers:
    - `PitchPad.tsx` calls `quantize(..., loopSettings.bpm)`, where `loopSettings = allLoopSettings[currentLoop as LoopName]`. If that is `null`, return early from the effect.
    - `DrumPad.tsx` passes the same `loopSettings` to `getScheduleEvents`.
    - `MidiContext.tsx` calls `calcEventDuration(start, Tone.getTransport().seconds, loopSettings, end)`.

- [ ] **Step 4: Run the tests and the type check**
  - Run: `pnpm test && npx tsc --noEmit`
  - Expected: PASS

- [ ] **Step 5: Commit**
  - Message: "Make audio timing utils take tempo and loop length as inputs"
  - Body: explicit dependencies. A default that reads global state lets a caller forget it, and that is how the stem bug happened.

### Task 2: Use calcEventDuration everywhere (audit 3.3)

**Files:**
- Modify: `components/Audio/DrumPad.tsx` (`handleRelease`), `components/Audio/PitchPad.tsx` (`handleRelease`), `components/Audio/StepSequencer/SequencerPadButton.tsx` (`handleRelease`)

**Interfaces:**
- Consumes: `calcEventDuration(startTicks, releaseTime, timing, sampleEnd)` from Task 1.

- [ ] **Step 1: Replace the inline calculations**
  - In each `handleRelease`, replace the inline `actualReleaseTime`, `startTimeInSeconds` and `loopEndInSeconds` block with a call to `calcEventDuration(currentEvent.current.startTime, Tone.getTransport().seconds, loopSettings, <end>)`. The `<end>` value differs per component; see the fix below.
  - Existing tests cover the function, so this step adds no new test.
- [ ] **Step 2: Fix the `DrumPad` sample-end bug**
  - `DrumPad` reads `allSampleData[selectedSampleId].settings.end`. That is the *selected* pad's end, not this pad's.
  - Use `allSampleData[id].settings.end`.
  - `PitchPad` keeps `selectedSampleId`, which is correct there.
- [ ] **Step 3: Verify**
  - Run: `pnpm test && npx tsc --noEmit`. Expected: PASS.
  - Do the manual check: record a held pad that crosses the loop end, and confirm it plays back with the same length.
- [ ] **Step 4: Commit**
  - Message: "Use calcEventDuration in every pad's release handler"
  - Body: DRY. One rule, four callers, like `calcReleaseDelay`. Mention the `DrumPad` `selectedSampleId` fix.

### Task 3: One mute/solo rule (audit 3.1, plus `solosExist` from 2e)

**Files:**
- Create: `lib/audio/muteSolo.ts`
- Modify: `app/hooks/useMutesAndSolos.ts`, `app/contexts/AudioContext.tsx`, `components/Dialogs/LoadSong.tsx`
- Test: `lib/audio/muteSolo.test.ts`

**Interfaces:**
- Produces:
  - `export function computeGain(settings: { mute: boolean; solo: boolean }, solosExist: boolean): 0 | 1`
  - `export function normalizeMuteSolo<T extends { mute: boolean; solo: boolean }>(settings: T): T`
  - `export function normalizeAllMuteSolo(data: Record<string, SampleTypeFE>): Record<string, SampleTypeFE>`
- `solosExist` in `AudioContext` becomes `useMemo(() => Object.values(allSampleData).some((s) => s.settings.solo), [allSampleData])`. Its `useState` and effect are deleted. The context type is unchanged.

- [ ] **Step 1: Write the failing tests** in `muteSolo.test.ts`:
  - `computeGain({ mute: true, solo: false }, false)` returns `0`.
  - `computeGain({ mute: false, solo: false }, true)` returns `0`.
  - `computeGain({ mute: false, solo: true }, true)` returns `1`.
  - `computeGain({ mute: false, solo: false }, false)` returns `1`.
  - `normalizeMuteSolo({ mute: true, solo: true })` returns `{ mute: false, solo: true }`.
  - `normalizeMuteSolo({ mute: true, solo: false })` returns its input unchanged.
  - `normalizeAllMuteSolo` normalizes every pad's `settings` and leaves the other fields alone.
- [ ] **Step 2: Run** `pnpm test lib/audio/muteSolo`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement**
  - Write the module.
  - In `useMutesAndSolos`:
    - `setSampleSolo(id, true)` also sets `mute: false`.
    - `setSampleMute(id, true)` also sets `solo: false`.
    - Fix the `"useClient"` typo to `"use client"` while there.
  - In `AudioContext`:
    - Wrap the localStorage `allSampleData` initializer in `normalizeAllMuteSolo`.
    - Use `computeGain` in the mutes/solos effect.
    - Make the `solosExist` `useMemo` change.
  - In `LoadSong.tsx`, wrap `samples` in `normalizeAllMuteSolo` before `setAllSampleData` and `loadSamplersToRef`.
  - `applySamplerSettings` still has its own gain rule; Task 4 removes it.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit**
  - Message: "Make mute and solo exclusive with one gain rule"
  - Body: DRY. The two rules had drifted and disagreed. Derived state is computed, not synced.

### Task 4: Apply sampler settings in one place, and fix the stale closure (audit 3.2 + broken window)

**Files:**
- Create: `lib/audio/applySoundSettings.ts`
- Modify: `app/contexts/AudioContext.tsx`, `components/Audio/SampleSettings.tsx`, `app/hooks/useDownloadWavStems.ts`
- Test: `lib/audio/applySoundSettings.test.ts`

**Interfaces:**
- Consumes: `computeGain` from Task 3.
- Produces:
  - `export function applySoundSettings(samplerWithFX: SamplerWithFX, settings: SampleSettingsFE): void`. It sets attack, release, reverse, pitch, volume, pan, highpass and lowpass. It does **not** set gain.
  - Fallbacks use `??`: attack, release, pitch, volume and pan default to `0`, highpass to `0`, and lowpass to `20000`. The old `|| 200` is a bug, because an unset lowpass should be fully open.
  - `AudioContext` gains `samplers: Record<string, SamplerWithFX>` as state, exposed on the context. `loadSamplersToRef` calls `setSamplers({ ...samplersRef.current })` after assigning, and the unmount cleanup is unchanged.
  - `applySamplerSettings` is removed from the context type and value.

- [ ] **Step 1: Write the failing tests** in `applySoundSettings.test.ts`, using a plain-object fake `SamplerWithFX` whose nodes are `{ value }` holders and whose `setReverse` is a `vi.fn()`:
  - Sets every field from a full settings object.
  - `lowpass: [0, "lowpass"]` gives a lowpass frequency of `0`.
  - A missing lowpass value gives `20000`.
  - Does not touch `gain.gain.value`.
- [ ] **Step 2: Run** `pnpm test lib/audio/applySoundSettings`. Expected: FAIL.
- [ ] **Step 3: Implement**
  - In `loadSamplersToRef`, call `applySoundSettings`, then `setSamplers`.
  - Add `samplers` to the mutes/solos gain effect's dependencies. A swapped sampler then gets its gain from the current `allSampleData`, not from a stale closure.
  - In `SampleSettings.tsx`, replace `updateSamplerRefSettings` with `applySoundSettings(samplersRef.current[id], { ...allSampleData[id].settings, ...settings })`.
  - In `useDownloadWavStems`, call `applySoundSettings`, then set `gain.gain.value = computeGain(settings, solosExist)`. That keeps today's behavior, where muted pads render silent stems.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then do the manual check: change the kit, change a sample, load a song, and confirm mute and solo still apply.
- [ ] **Step 5: Commit**
  - Message: "Apply sampler sound settings from one function"
  - Body: DRY, and removing a stale closure. Gain has one owner, the effect.

### Task 5: One transport owner (audit 2b, 3.5)

**Files:**
- Create: `lib/audio/applyLoopSettings.ts`
- Modify: `app/contexts/AudioContext.tsx`, `components/Audio/Loop.tsx`, `app/hooks/useDownloadWavStems.ts`
- Test: `lib/audio/applyLoopSettings.test.ts`

**Interfaces:**
- Produces:
  - `export type TransportLike = { bpm: { value: number }; swing: number; timeSignature: number | number[]; loop: boolean; loopStart: Tone.Unit.Time; loopEnd: Tone.Unit.Time }`
  - `export function applyLoopSettings(transport: TransportLike, settings: LoopSettingsFE): void`. It sets `bpm.value`, `swing`, `timeSignature = beats`, `loop = true`, `loopStart = "0:0:0"` and `loopEnd = \`${bars}:0:0\``.

- [ ] **Step 1: Write the failing test.** Pass a plain-object transport and `{ bpm: 90, swing: 0.2, beats: 3, bars: 4, isInitialized: true }`, then assert all six fields.
- [ ] **Step 2: Run** `pnpm test lib/audio/applyLoopSettings`. Expected: FAIL.
- [ ] **Step 3: Implement**
  - In `AudioContext`, one effect calls `applyLoopSettings(Tone.getTransport(), settings)`. It runs on `[currentLoop, settings?.bpm, settings?.swing, settings?.beats, settings?.bars]`.
  - A second effect, keyed on `[currentLoop]` only, keeps the stop, reset and restart logic for switching loops.
  - Delete both transport effects from `Loop.tsx`, and its `Tone` import if nothing else uses it.
  - `useDownloadWavStems` calls `applyLoopSettings(transport, loopSettings)` in place of its six assignments.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then do the manual check. Change bpm while the loop plays. Change bars while stopped. Switch loops while playing.
- [ ] **Step 5: Commit**
  - Message: "Give the live transport one owner and one setup function"
  - Body: global state with one writer, and DRY across three copies.

### Task 6: Shared trigger rule for scheduled events (audit 3.4)

**Files:**
- Create: `lib/audio/util/calcTriggerParams.ts`
- Modify: `components/Audio/DrumPad.tsx` (Part callback), `components/Audio/PitchPad.tsx` (Part callback), `app/hooks/useDownloadWavStems.ts` (Part callback)
- Test: `lib/audio/util/calcTriggerParams.test.ts`

**Interfaces:**
- Produces: `export function calcTriggerParams(settings: Pick<SampleSettingsFE, "start" | "end" | "oneShot" | "reverse">, playbackRate: number, eventDuration: number, bufferDuration: number): { duration: number; offset: number }`
  - `sampleDuration = end ? (end - start) / playbackRate : null`. This is a truthiness check, as in today's code, so an `end` of `0` counts as unset. Keep it that way so behavior doesn't change, and pin it with a test.
  - `duration = oneShot ? (sampleDuration ?? 999) : Math.min(sampleDuration ?? Infinity, eventDuration)`
  - `offset = reverse ? bufferDuration - (end ?? bufferDuration) : start`
  - Callers pass `calcPlaybackRate(note)`, which keeps Tone out of the util.

- [ ] **Step 1: Write the failing tests**
  - End-capped: `{start: 0, end: 1, oneShot: false, reverse: false}`, rate 2, event duration 2, buffer 3 gives `{ duration: 0.5, offset: 0 }`.
  - One-shot with no end gives duration `999`.
  - Reverse: `{start: 0.5, end: 2, reverse: true}`, buffer 3 gives offset `1`.
  - `end: 0` is treated as unset: the duration is the event duration.
- [ ] **Step 2: Run** `pnpm test lib/audio/util/calcTriggerParams`. Expected: FAIL.
- [ ] **Step 3: Implement**, and use it in the three Part callbacks.
  - `PitchPad`'s callback is visual only. It uses `duration` for its highlight timeout. It now honors one-shot, so a one-shot pad's highlight stays lit for the full clip. That is intended.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then do the manual check: play back one-shot, reversed and end-capped pads, and export a stem.
- [ ] **Step 5: Commit**
  - Message: "Share the trigger duration and offset rule across schedulers"
  - Body: DRY.

### Task 7: No sampler ref reads during render (audit 2f)

**Files:**
- Modify: `components/Audio/DrumMachine.tsx`, `components/Audio/PitchGrid.tsx`, `components/Audio/SampleSettings.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: `samplers` state from Task 4.

- [ ] **Step 1: Replace the render-time reads**
  - Replace every render-time `samplersRef.current[...]` with `samplers[...]` from `useAudioContext()`, in `DrumMachine`, `PitchGrid` and the `SampleSettings` `analyser`.
  - Delete the unused `sampler` prop from `PitchGrid`'s props type and from `page.tsx`.
  - Reads inside handlers and effects stay on `samplersRef`.
- [ ] **Step 2: Verify**
  - Run: `pnpm test && npx tsc --noEmit && npx eslint src/components/Audio/SampleSettings.tsx`. Expected: PASS, and the `react-hooks/refs` warnings are gone.
  - Do the manual check: change the kit and confirm the pads play the new samples without a reload.
- [ ] **Step 3: Commit**
  - Message: "Render from sampler state instead of reading the ref"
  - Body: no programming by coincidence. A ref change never re-renders, so the code worked only because `samplersLoading` changed at the same time.
