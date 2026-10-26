# Pragmatic Programmer Refactor Audit

Audit of `frontend-next/` against *The Pragmatic Programmer*, focused on
orthogonality, global state, and DRY. Verified against `main` @ 744c18e3.

**Purpose:** this is a learning exercise for the repo owner. When working from
this doc, explain *which principle* each change applies and *why*, not just
what changed. Prefer small, reviewable steps over one large rewrite.

**Paths:** all paths are relative to `frontend-next/src/` unless noted. Line
numbers drift, so findings name files and symbols; grep for them.

**Verification:** run `pnpm test` (Vitest) and `npx tsc --noEmit` in
`frontend-next/`. Pad playback, recording, and the step sequencer have no
automated coverage, so check them manually in the browser after each step.

---

## Status of earlier findings

Fixed on `main`, so no action is needed:

- Stem export used the selected loop's tempo and length for every loop. Fixed
  by d57267b6 and 31782a3a: `useDownloadWavStems` now passes each loop's own
  timing to `getScheduleEvents`, and `calcRenderDuration` sizes the render.
- Triplet quantize parsing (`"16t"` read as `"1t"`): fixed in
  `lib/audio/util/quantize.ts` (`parseInt`).
- Song ownership check on `PUT`/`DELETE /beats/me/songs/:_id`: `ownsSong` in
  `backend/src/routes/beats.ts`.
- Google Drive query injection: Drive removed; drums are served from R2.

## What's going well

Use these as models for the rest of the refactor:

- `lib/audio/util/calcReleaseDelay.ts` is pure, tested, and used by every
  caller (`DrumPad`, `PitchPad`, `SequencerPadButton`, `MidiContext`). This is
  what DRY looks like when it works.
- `lib/audio/util/calcRenderDuration.ts` takes all of its inputs as
  parameters. It has no hidden transport dependency.
- The Vitest suite under `lib/audio/util/*.test.ts` and `app/hooks/*.test.ts`
  makes the util refactors below safe to do.

---

## 1. Orthogonality: `AudioContext` is a god object

`app/contexts/AudioContext.tsx` (~750 lines, ~37 context members) mixes seven
concerns. Each has a different reason to change:

| Concern | Symbols |
|---|---|
| Song metadata | `songTitle`, `songId` |
| Sample domain data | `allSampleData`, `initLocSampleData`, `initKitSampleData`, `initKitSamples` |
| Random selection | `selectRandomUrlEntries` |
| Audio engine (Tone nodes) | `makeSamplerWithFX`, `cleanupSampler`, `samplersRef`, `masterGainNode` |
| Caching | `storeAudioInIndexedDB`, `getCachedAudioUrlFromIndexedDB` |
| Persistence | the localStorage `useEffect`s |
| Transport/playback | `loopIsPlaying`, `isRecording`, the transport effects |

Specific couplings:

- `makeSamplerWithFX` builds a Tone FX chain. It also toggles loading UI
  state and resets `makeBeatsButtonPressed` from `UIContext`. An audio
  factory should not know about a UI button.
- `makeSamplerWithFX(id, url, stems = false)` uses a boolean mode flag to
  switch between "UI sampler" and "offline render sampler". That is two
  functions in one.
- The sampler-loading `useEffect` has an empty dependency array with the
  comment "if this empty dependency array is removed, the samplers are loaded
  with every update". This is programming by coincidence.
- Every consumer re-renders on every change, because one context value holds
  everything.

**Direction:** split by reason to change. Use an `AudioEngine` module with no
React that owns the Tone nodes and the transport. Add a sample-data reducer
with intent-named actions, a persistence hook, and a transport context.

## 2. Global state

### 2a. Audio utils still fall back to the global transport

The stem fix added optional timing parameters, but the dependency is still
hidden by default:

- `lib/audio/util/quantize.ts`: `bpm` defaults to
  `Tone.getTransport().bpm.value`.
- `lib/audio/util/getScheduleEvents.ts`: `timing?: LoopTiming` is optional.
  Without it, the function reads `loopStart`, `loopEnd`, and tick conversion
  from the global transport.
- `lib/audio/util/calcEventDuration.ts`: always reads
  `Tone.getTransport().seconds`. It has no parameter at all.

Live callers (`DrumPad.tsx` calls `getScheduleEvents` and `PitchPad.tsx` calls
`quantize`) omit the timing and silently use the global. An optional
parameter that defaults to global state still lets a caller forget it. That
is how the stem bug happened.

**Direction:** make the timing parameter required and pass the current loop's
settings explicitly. Give `calcEventDuration` a `releaseTime` parameter.
`calcRenderDuration` already shows the target shape.

### 2b. Several writers configure the transport

- `app/contexts/AudioContext.tsx` has two effects. One sets `bpm`, `swing`,
  `timeSignature`, `loop`, `loopStart`, and `loopEnd`. The other restarts the
  transport.
- `components/Audio/Loop.tsx` has two effects that set the same fields again.
- `app/hooks/useDownloadWavStems.ts` copies the same six assignments onto the
  offline transport (commented "Match the live transport setup").

The live transport has two owners, so the behavior depends on effect order.
The six-line setup is also repeated three times. If a new field is added
(for example, `loopStart` from settings), all three copies must change.

**Direction:** one owner for the live transport. One
`applyLoopSettings(transport, settings)` function used by the live owner and
the stem renderer.

### 2c. localStorage is a second source of truth for `songId`

`songId` lives in `AudioContext` state, but:

- `components/MainMenu.tsx` (`handleSaveSong`, `handleDeleteSong`) reads
  `localStorage.getItem("songId")` directly.
- `components/Dialogs/SaveNewSong.tsx` and `components/Dialogs/LoadSong.tsx`
  write `localStorage.setItem("songId", …)` without calling `setSongId`.
- `MainMenu.tsx` `handleReset` removes the `loops` and `samples` keys that
  `AudioContext` owns.

The state goes stale after save or load. Make one module own each storage key.

### 2d. `UIContext` passes messages through mutable refs

`confirmActionRef`, `apiResponseMessageRef`, and `uiWarningMessageRef` act as
global mailboxes. Every caller must write the ref and then call
`setShowDialog(...)`, in that order. This is temporal coupling. Example:
`MainMenu.tsx` `handleLogout` opens `"confirm-action"` without setting
`confirmActionRef`, so the dialog shows the previous action.

`showDialog` is typed `string | null`. It should be a union of dialog names.
`ConfirmAction` is also declared twice: in `UIContext.tsx` and as
`ConfirmActionRef` in `MainMenu.tsx`.

**Direction:** one typed call, e.g. `openDialog({ type: "confirm", message,
onConfirm })`.

### 2e. Derived state is stored and synced by hand

- `hotKeysActive` is derived from `showDialog` by an effect in `MainMenu.tsx`.
  It is also set by hand in `ConfirmActionDialog`, `KitMenu`,
  `CollectionMenu`, `DialogWrapper`, and `StepSequencer/StepSequencer.tsx`.
  Compute it instead.
- `solosExist` is stored and synced by an effect in `AudioContext.tsx`. It
  could be a `useMemo`.
- `isSelected` in `DrumPad.tsx` mirrors `selectedSampleId === id`.

### 2f. Refs read during render

These read `samplersRef.current[...]` during render, not inside a handler or
effect:

- `app/page.tsx` (the `sampler` prop for `PitchGrid`)
- `components/Audio/DrumMachine.tsx`
- `components/Audio/PitchGrid.tsx`
- `components/Audio/SampleSettings.tsx` (`analyser`)

Ref changes do not trigger a re-render. This works only because
`samplersLoading` happens to change at the same time. Reads inside event
handlers (`DrumPad`, `PitchPad`, `SequencerPadButton`) are fine.

## 3. DRY: duplicated knowledge

DRY is about knowledge, not text. Items 1 and 2 have already drifted apart.

1. **Mute/solo gain rule, two versions with different logic** in
   `AudioContext.tsx`:
   - `applySamplerSettings`: solo overrides mute.
   - The mutes/solos `useEffect`: `mute ? 0 : solosExist ? …` (mute overrides solo).

   A pad that is both muted and soloed behaves differently on load than after
   an edit.
2. **Sampler settings applied twice:** `applySamplerSettings` in
   `AudioContext.tsx` and `updateSamplerRefSettings` in
   `components/Audio/SampleSettings.tsx`. Both use the suspicious lowpass
   fallback `|| 200`.
3. **Record-duration logic in four places:** `calcEventDuration` exists in
   `lib/audio/util/calcEventDuration.ts`, but only `MidiContext.tsx` uses it.
   `DrumPad.tsx`, `PitchPad.tsx`, and the newer
   `StepSequencer/SequencerPadButton.tsx` each inline the same
   `loopEndInSeconds` calculation. Compare with `calcReleaseDelay`, which all
   four use.
4. **`Tone.Part` scheduling** is copied across `DrumPad.tsx`, `PitchPad.tsx`,
   and `useDownloadWavStems.ts`.
5. **Transport setup** is copied three times (see 2b).
6. **Touch tracking** (`elementFromPoint`, active set, press/release diffing)
   is copied between `DrumMachine.tsx` and `PitchGrid.tsx`.
7. **`app/hooks/useDrumPadHotKeys.ts` exists and is tested, but nothing uses
   it.** `DrumPad.tsx` inlines the same keydown/keyup logic.
8. **Default sample settings** are copied in `initLocSampleData` and
   `initKitSampleData`.
9. **Default loop settings** appear in `AudioContext.tsx` (initial state) and
   `MainMenu.tsx` (`handleReset`).
10. **Pad layout as magic numbers and strings:**
    - ``pad-${index + 13}`` and `Math.min(12, n)` in `AudioContext.tsx`.
    - `length: 16` in `DrumMachine.tsx` and `StepSequencer/SequencerGrid.tsx`.
    - `id.split("-")[1]` in `DrumPad.tsx`, `useDownloadWavStems.ts`, and
      `SequencerGrid.tsx`.
    - The dialog text "pads 1-12" (`CollectionMenu.tsx`) and "pads 13-16"
      (`KitMenu.tsx`).

    Changing the pad count means hunting across the codebase. Define a pad
    layout constant.
11. **Loop names:** `["A", "B", "C", "D"]` is redeclared in `Loop.tsx` and
    `useDownloadWavStems.ts`. `currentLoop` is typed `string` and cast
    `as LoopName` 17 times, although `LoopName` exists in `types/audioTypes.ts`.
12. **API layer rebuilt per component:** `BASE_URL`, `dotenv.config()` (5
    files, a no-op in the browser), the `Authorization: Bearer` header, and the
    `AxiosError` handling repeat in `MainMenu.tsx`, `LoadSong.tsx`,
    `SaveNewSong.tsx`, and `AuthContext.tsx`. Extract an API client module.

## 4. Broken windows

- A large commented-out block in `AudioContext.tsx` (an old first-interaction
  `Tone.start` listener).
- `"useClient"` typo in `app/hooks/useMutesAndSolos.ts`; the directive does
  nothing.
- The `sampler` prop on `PitchGrid` is declared and passed from `page.tsx` but
  ignored (`const PitchGrid: React.FC<PitchGridProps> = () =>`).
- Stale closure: `applySamplerSettings` reads `allSampleData` from its closure
  to check solos. When `loadSamplersToRef` runs right after `setAllSampleData`
  in the same handler (`MainMenu` reset, `KitMenu`, `CollectionMenu`,
  `LoadSong`), it uses the old data.

---

## Suggested order

Each step is small, independently shippable, and teaches one principle.

1. **Make the utils fully pure (2a).** Make the timing parameter required in
   `quantize` and `getScheduleEvents`, and add a `releaseTime` parameter to
   `calcEventDuration`. Update the tests and the live callers. Teaches
   explicit dependencies; the stem bug shows why defaults to global state are
   risky.
2. **Use the existing helpers (3.3, 3.7).** Use `calcEventDuration` in
   `DrumPad`, `PitchPad`, and `SequencerPadButton`, and use
   `useDrumPadHotKeys` in `DrumPad`. Teaches DRY by finishing what
   `calcReleaseDelay` already started.
3. **One mute/solo rule (3.1).** Write one `computeGain(settings, solosExist)`
   with a test, and use it in both places. Ask the owner which rule is
   intended.
4. **One transport setup (2b, 3.5).** Extract
   `applyLoopSettings(transport, settings)` and give the live transport one
   owner.
5. **Typed dialogs (2d).** Replace the refs plus `showDialog` with
   `openDialog(payload)`. Teaches removing temporal coupling.
6. **One owner per storage key (2c).**
7. **Extract `AudioEngine` (1).** A class with no React that owns the Tone
   nodes and the transport. This is the big orthogonality exercise.
8. **Split `AudioContext` (1).** A sample-data reducer, a persistence hook,
   and a transport context.
