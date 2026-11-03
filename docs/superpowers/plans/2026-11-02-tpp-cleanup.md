# TPP Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining audit items in `docs/tpp-refactor-audit.md` except the `AudioEngine` extraction (item 1). This covers typed dialogs, one owner per storage key, derived UI state, an API client, and the DRY items 3.4 (remainder) and 3.6–3.12.

**Architecture:** Shared knowledge moves into small modules that each own one fact:
- `lib/constants/loops.ts` and `lib/constants/padLayout.ts` hold the loop names and the pad layout.
- `lib/audio/defaults.ts` holds the default settings.
- `lib/storage.ts` holds the localStorage keys.
- `lib/api/client.ts` holds the HTTP calls.
- `app/hooks/useTouchPads.ts` holds the touch tracking.

React state that can be computed is computed. The dialog state becomes one typed value instead of a string plus three mutable refs.

**Tech Stack:** Next 16, React 19, TypeScript, Tone.js, axios, Vitest 4 with jsdom and `@testing-library/react` (no jest-dom, no user-event).

**Spec:** `docs/tpp-refactor-audit.md`, items 2c, 2d, 2e (`hotKeysActive`, `isSelected`), 3.4 (remainder), 3.6–3.12, and the commented-out `Tone.start` block from section 4. Items 2a, 2b, 2f, 3.1–3.3, 3.5, the `solosExist` part of 2e, and the other broken windows were done by `docs/superpowers/plans/2026-10-26-engine-path-refactor.md` (PR #4).

## Global Constraints

- All paths are relative to `frontend-next/src/` unless noted. Run commands from `frontend-next/`.
- After every task, these must hold:
  - `pnpm test` passes.
  - `npx tsc --noEmit` passes.
  - `./node_modules/.bin/eslint . -f json -o /tmp/eslint.json` shows no new errors. Use the JSON output, because the `rtk` proxy mangles the plain output.
- Commits follow the repo's style: an imperative, sentence-case subject with no `feat:` prefix. Each commit body names the TPP principle it applies (DRY, orthogonality, temporal coupling, and so on).
- Do not touch the `AudioEngine` work or split `AudioContext` (audit item 1). Only the lines named here change in `AudioContext.tsx`.
- Do not add dependencies. Remove `dotenv` (Task 9). With pnpm 11's `minimumReleaseAge`, never accept auto-added `minimumReleaseAgeExclude` entries in `pnpm-workspace.yaml`.
- Tests are co-located as `*.test.ts` or `*.test.tsx` next to the source. Import `describe`/`it`/`expect`/`vi` from `vitest`, and call `cleanup` in `afterEach` for any rendering test. No setup file exists.
- Mute and solo stay mutually exclusive (the owner's rule from PR #4).
- **Manual check after Tasks 5, 6, 7, 9 and 10:** run `pnpm dev` and work through these:
  - Play and record pads.
  - Switch loops.
  - Open and close every dialog from the main menu, including reset, logout, save, load and delete.
  - Check that pad hotkeys stop while a dialog is open and resume after it closes.
  - On a touch device or emulator, slide a finger across pads.

## Review Focus

1. **The confirm dialog after logout or a cancelled confirm.** It must never show a stale message or action from an earlier confirm. Task 7 adds a test that each `openDialog` call carries its own `onConfirm`.
2. **Hotkeys after a dialog closes by any route:** ✕, click outside, the confirm button, or a menu that closes itself after loading. Hotkeys must come back every time. Task 8 makes `hotKeysActive` a pure function of the dialog state and tests it.
3. **Saving after a load, and saving after a delete.** A save right after "Load" must update the loaded song, not create a new one. A save right after "Delete" must create a new song, not PUT to the deleted id. Task 10 tests that `songId` persists and clears.
4. **A network failure (server unreachable) during the login check.** The user must stay logged in and see no dialog. Only a server response may log the user out. Task 9 tests `apiErrorMessage` on a network error, and the login-check rule.
5. **A touch cancelled by the OS** (an iOS system gesture or an incoming call). The pad must release and not stay held. Task 6 adds `touchcancel` handling and a test.

---

### Task 1: Typed loop names (audit 3.11)

**Files:**
- Create: `lib/constants/loops.ts`, `lib/constants/loops.test.ts`
- Modify: `types/audioTypes.ts`, `types/audioTypesFE.ts` (`events` key type), `app/contexts/AudioContext.tsx` (`currentLoop` type, state at ~line 514, cast at ~612), `components/Audio/Loop.tsx`, `app/hooks/useDownloadWavStems.ts`, `app/hooks/useSequencerGrid.ts`, `lib/audio/util/getScheduleEvents.ts`, and every file with an `as LoopName` cast. The fact sheet lists 23 sites; find them with `grep -rn "as LoopName" src`.

**Interfaces:**
- Produces:
  - `export const LOOP_NAMES: readonly LoopName[]` (`["A", "B", "C", "D"]`)
  - `export function isLoopName(value: string): value is LoopName`
  - `export function emptyLoopEvents<T>(): Record<LoopName, T[]>`, which returns a fresh object each call
  - In `AudioContext`: `currentLoop: LoopName` and `setCurrentLoop: React.Dispatch<React.SetStateAction<LoopName>>`
  - `SampleType.events` and `SampleTypeFE.events` become `Record<LoopName, …>`
  - `getScheduleEvents(…, currentLoop: LoopName, …)`

- [ ] **Step 1: Write the failing tests** in `lib/constants/loops.test.ts`:
  - `LOOP_NAMES` equals `["A", "B", "C", "D"]`.
  - `isLoopName("C")` is `true`. `isLoopName("E")` and `isLoopName("a")` are `false`.
  - `emptyLoopEvents()` equals `{ A: [], B: [], C: [], D: [] }`.
  - Two calls to `emptyLoopEvents()` return different objects, and `.A` is not the same array (`not.toBe`).
- [ ] **Step 2: Run** `pnpm test src/lib/constants/loops`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `loops.ts`. Retype `currentLoop`, the `events` records and the util params. Then delete every `as LoopName` cast and both `["A","B","C","D"]` literals.
  - In `LoadSong.tsx:100`, replace `as LoopName[]` with `LOOP_NAMES`.
  - In `page.tsx` the Shift+letter check, use `isLoopName(key)`.
  - Replace the two `{ A: [], B: [], C: [], D: [] }` literals in `AudioContext.tsx` with `emptyLoopEvents()`.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then `grep -rn "as LoopName" src`. Expected: tests and tsc pass, and grep prints nothing.
- [ ] **Step 5: Commit**
  - Message: "Type the current loop as LoopName and share the loop list"
  - Body: DRY, and let the type system carry the knowledge instead of casts.

### Task 2: One set of defaults, and remove the dead Tone.start block (audit 3.8, 3.9, section 4)

**Files:**
- Create: `lib/audio/defaults.ts`, `lib/audio/defaults.test.ts`
- Modify: `app/contexts/AudioContext.tsx` (`initLocSampleData` ~135–170, `initKitSampleData` ~209–244, initial loops ~457–465, commented block ~537–565, stray comments ~656 and ~678), `components/MainMenu.tsx` (`handleReset` ~71–78), `components/Audio/Loop.tsx` (fallbacks at ~63, 78, 92, 106)

**Interfaces:**
- Consumes: `emptyLoopEvents` (Task 1)
- Produces:
  - `export function defaultSampleSettings(): SampleSettingsFE`. It returns a fresh object, including fresh `highpass`/`lowpass` tuples and a fresh `ui`. Its values are exactly today's literal: mute/solo/reverse/timeStretch/oneShot/loop/quantize `false`, start 0, end null, volume 0, pan 0, baseNote "C4", pitch 0, attack 0, release 0, quantVal "4", highpass `[0, "highpass"]`, lowpass `[20000, "lowpass"]`, ui `{ zoom: 0, seekTo: 0 }`.
  - `export const DEFAULT_LOOP_TIMING = { beats: 4, bars: 2, bpm: 120, swing: 0 } as const`
  - `export function defaultLoopSettings(): AllLoopSettingsFE`. Loop A is `{ ...DEFAULT_LOOP_TIMING, isInitialized: true }`. Loops B–D have `isInitialized: false`, with the same timing.

- [ ] **Step 1: Write the failing tests:**
  - `defaultSampleSettings()` equals the literal above.
  - Two calls return objects that are not the same object (`not.toBe`), and whose `highpass` and `ui` are not the same objects either.
  - `defaultLoopSettings().A.isInitialized` is `true`. `B`, `C` and `D` have `isInitialized` `false` and `bars` `2`.
  - Two calls to `defaultLoopSettings()` return objects whose `.A` is not the same object.
- [ ] **Step 2: Run** `pnpm test src/lib/audio/defaults`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use `defaultSampleSettings()` and `emptyLoopEvents()` in both `init…SampleData` functions. Use `defaultLoopSettings()` for the initial loop state and in `handleReset`.
  - In `Loop.tsx`, the fallbacks read `DEFAULT_LOOP_TIMING`. The bars fallback changes from `1` to `2`, which fixes the drift.
  - Delete the commented-out effect and the two stray comment lines.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit**
  - Message: "Define default sample and loop settings once"
  - Body: DRY, and fix a broken window (remove the dead `Tone.start` listener).

### Task 3: Pad layout constant (audit 3.10)

**Files:**
- Create: `lib/constants/padLayout.ts`, `lib/constants/padLayout.test.ts`
- Modify:
  - `app/contexts/AudioContext.tsx` (~124, 180, 198, 276, 519)
  - `components/Audio/DrumMachine.tsx:9`
  - `components/StepSequencer/SequencerGrid.tsx` (~103–106, 123, 137)
  - `components/StepSequencer/StepSequencer.tsx` (~402, 429)
  - `components/Audio/DrumPad.tsx:60–61`
  - `components/StepSequencer/SequencerPadButton.tsx:60`
  - `app/hooks/useDownloadWavStems.ts:122`
  - the copy in `CollectionMenu.tsx:69`, `KitMenu.tsx:71`, `HelpShortcuts.tsx:55–56` and `About.tsx:35–36`

**Interfaces:**
- Produces:
  - `export const PAD_COUNT = 16`, `LOC_PAD_COUNT = 12`, `KIT_PAD_COUNT = 4`
  - `export function padId(n: number): string` (1-based, returns `"pad-n"`)
  - `export function padNumber(id: string): number`, the inverse
  - `export const ALL_PAD_IDS: readonly string[]` (`pad-1`…`pad-16`)
  - `export const LOC_PAD_IDS` and `KIT_PAD_IDS` (the first 12 and the last 4)
  - `export const LOC_PADS_LABEL = "pads 1–12"` and `KIT_PADS_LABEL = "pads 13–16"`. Use an en dash in all four copy sites. The two confirm dialogs used a hyphen; this unifies them on the en dash.
  - `export const DEFAULT_SELECTED_PAD = padId(1)`

- [ ] **Step 1: Write the failing tests:**
  - `padId(13)` is `"pad-13"`, and `padNumber("pad-13")` is `13`.
  - `ALL_PAD_IDS` has length 16, first `"pad-1"`, last `"pad-16"`.
  - `KIT_PAD_IDS` equals `["pad-13", "pad-14", "pad-15", "pad-16"]`.
  - `drumKeys.length` equals `PAD_COUNT`, which guards the key map.
- [ ] **Step 2: Run** `pnpm test src/lib/constants/padLayout`. Expected: FAIL.
- [ ] **Step 3: Implement**, and replace every listed site.
  - The kit pad id in `AudioContext` becomes `KIT_PAD_IDS[index]`.
  - `Math.min(12, n)` becomes `Math.min(LOC_PAD_COUNT, n)`.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then `grep -rnE 'length: 16|split\("-"\)\[1\]|index \+ 13' src`. Expected: PASS, and grep prints nothing.
- [ ] **Step 5: Commit**
  - Message: "Describe the pad layout in one module"
  - Body: DRY. Changing the pad count is now one edit.

### Task 4: Use the drum pad hotkey hook and share the key symbol (audit 3.7)

**Files:**
- Modify: `lib/constants/drumKeys.ts` (add `getKeySymbol`), `components/Audio/DrumPad.tsx` (~215–235, 252–260, 265–278), `components/StepSequencer/SequencerPadButton.tsx:22–30`
- Test: `lib/constants/drumKeys.test.ts` (create)

**Interfaces:**
- Consumes: `useDrumPadHotKeys({ hotKeysActive, padKey, onPress, onRelease })` (it exists already and is tested)
- Produces: `export function getKeySymbol(key: string): string`. It maps `ArrowLeft/Up/Right/Down` to `← ↑ → ↓`, and passes any other key through.

- [ ] **Step 1: Write the failing test:**
  - `getKeySymbol("ArrowUp")` is `"↑"`, and the same holds for the other three arrows.
  - `getKeySymbol("q")` is `"q"`.
- [ ] **Step 2: Run** `pnpm test src/lib/constants/drumKeys`. Expected: FAIL.
- [ ] **Step 3: Implement** `getKeySymbol`, and delete both local copies.
  - In `DrumPad`, replace the inline keydown/keyup handlers and their effect with one `useDrumPadHotKeys` call, passing the existing press and release handlers.
  - `SequencerPadButton` keeps its own listener, because it drives visuals only and has its own timeout logic.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`. Expected: PASS. The hook's existing tests still pass.
- [ ] **Step 5: Commit**
  - Message: "Use useDrumPadHotKeys in DrumPad"
  - Body: DRY. Finish what the tested hook started.

### Task 5: PitchPad schedules through getScheduleEvents (audit 3.4 remainder)

The trigger rule is already shared (`calcTriggerParams`). What remains:
- `PitchPad` rebuilds the event list itself, with `ticksToSeconds` plus `quantize`. Its copy skips the loop-end wrap and the de-duplication in `getScheduleEvents`, so a quantized hit at the loop end highlights at the wrong time.
- The Part callback type guard is copied three times.

**Files:**
- Modify: `lib/audio/util/getScheduleEvents.ts` (export the guard), `components/Audio/PitchPad.tsx` (~209–247), `components/Audio/DrumPad.tsx` (Part callback ~298), `app/hooks/useDownloadWavStems.ts` (~65)
- Test: `lib/audio/util/getScheduleEvents.test.ts`

**Interfaces:**
- Produces: `export function isPlayableEvent(event: unknown): event is SampleEventFE & { duration: number }`. It is true for an object with a non-null `duration`, and false for `null`, `undefined`, non-objects and `duration: null`.

- [ ] **Step 1: Write the failing tests** in `getScheduleEvents.test.ts`:
  - `isPlayableEvent({ duration: 0.25, note: "C4" })` is `true`.
  - `isPlayableEvent({ duration: null })`, `isPlayableEvent(null)` and `isPlayableEvent(undefined)` are `false`.
- [ ] **Step 2: Run** `pnpm test src/lib/audio/util/getScheduleEvents`. Expected: FAIL, export missing.
- [ ] **Step 3: Implement** the guard, and use it in all three Part callbacks.
  - In `PitchPad`, build the events as `getScheduleEvents(allSampleData, selectedSampleId, currentLoop, loopSettings).filter(([, e]) => e.note === note)`.
  - Drop PitchPad's local `ticksToSeconds`/`quantize` imports if they become unused.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then do the manual check. In pitch mode, with quantize on, a note recorded at the very end of the loop must highlight on beat 1.
- [ ] **Step 5: Commit**
  - Message: "Schedule PitchPad highlights through getScheduleEvents"
  - Body: DRY. One scheduling rule, so PitchPad now wraps at the loop end.

### Task 6: Shared touch tracking (audit 3.6)

**Files:**
- Create: `app/hooks/useTouchPads.ts`, `app/hooks/useTouchPads.test.ts`
- Modify: `components/Audio/DrumMachine.tsx:22–102`, `components/Audio/PitchGrid.tsx:34–114`

**Interfaces:**
- Produces:
  - `export type PadHandlers = { handlePress: () => void; handleRelease: () => void }`
  - `export function diffTouches(active: ReadonlySet<string>, touched: readonly string[]): { pressed: string[]; released: string[] }` (pure)
  - `export function findKeyForTarget(elements: Record<string, HTMLElement | null>, target: Element | null): string | null` (pure). It returns the key whose element `contains(target)`.
  - `export default function useTouchPads(elementsRef: React.RefObject<Record<string, HTMLElement | null>>, handlersRef: React.RefObject<Record<string, PadHandlers>>): void`
- Behavior to keep:
  - Listeners go on `document`.
  - On `touchstart`, every touch counts (multi-touch): press new keys and release keys that are gone.
  - On `touchmove`, act only on a single touch.
  - On `touchend`, release all keys and clear them.
- Behavior to change:
  - Hold the active set in a `useRef<Set<string>>`, not state, so the listeners register once.
  - Add `touchcancel` with the same handling as `touchend`.

- [ ] **Step 1: Write the failing tests:**
  - `diffTouches(new Set(["a", "b"]), ["b", "c"])` equals `{ pressed: ["c"], released: ["a"] }`.
  - `diffTouches(new Set(), [])` equals `{ pressed: [], released: [] }`.
  - `findKeyForTarget({ x: parent }, child)` is `"x"`, where `child` is appended to `parent`. With an unrelated element, it returns `null`.
  - Hook test (`renderHook`): stub `document.elementFromPoint` to return a pad element.
    - Dispatch `touchstart`, then `touchcancel`, on `document`.
    - Expect `handlePress` and `handleRelease` each to be called once.
    - Build each event with `new Event("touchstart")`, then `Object.defineProperty(event, "touches", { value: [{ clientX: 0, clientY: 0 }] })`.
- [ ] **Step 2: Run** `pnpm test src/app/hooks/useTouchPads`. Expected: FAIL.
- [ ] **Step 3: Implement** the hook. In `DrumMachine` and `PitchGrid`, replace the copied effect, the Set state and the local `get…FromTouch` helpers with one `useTouchPads(...)` call.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then do the manual touch check. Slide across drum pads and across pitch pads, and use two fingers on two pads.
- [ ] **Step 5: Commit**
  - Message: "Share touch tracking between the drum and pitch grids"
  - Body: DRY. Also release pads on `touchcancel`.

### Task 7: Typed dialogs (audit 2d)

**Files:**
- Modify: `app/contexts/UIContext.tsx`, `app/page.tsx:232–247` (the render switch) and `:122, 133, 138`, `components/DialogWrapper.tsx`, `components/Dialogs/ConfirmActionDialog.tsx`, `APIResponseDialog.tsx`, `UIWarning.tsx`, and every `setShowDialog`/ref caller listed in the fact sheet: `MainMenu`, `StepSequencer`, `CollectionMenu`, `KitMenu`, `SaveNewSong`, `LoadSong`, `AuthContext`, `useSelectLoop`, `Loop`, `ChooseSample`, `Welcome`, `About` and `SampleSettings`
- Test: `app/contexts/UIContext.test.tsx`, `components/Dialogs/ConfirmActionDialog.test.tsx` (create both)

**Interfaces:**
- Produces, in `UIContext.tsx`:
  ```ts
  export type DialogState =
    | { type: "confirm-action"; message: string; buttonText: string; onConfirm: () => void }
    | { type: "api-response"; message: string }
    | { type: "ui-warning"; message: string }
    | { type: "choose-sample" | "load-song" | "save-new-song" | "collection-menu"
          | "kit-menu" | "auth-dialog" | "about" | "help-shortcuts" | "welcome" };
  ```
  - The context gets `dialog: DialogState | null`, `openDialog(next: DialogState): void` and `closeDialog(): void`.
  - Remove `showDialog`, `setShowDialog`, `confirmActionRef`, `apiResponseMessageRef`, `uiWarningMessageRef`, the `ConfirmAction` type, and the duplicate `ConfirmActionRef` in `MainMenu.tsx`.
  - `ConfirmActionDialog`, `APIResponseDialog` and `UIWarning` take their fields as props. `page.tsx` narrows on `dialog.type` and spreads the props.
- Rules:
  - `MainMenu.handleLogout` no longer opens any dialog. The menu's "Log Out" item opens the confirm with `onConfirm: handleLogout`. The check-login path calls `handleLogout()` and then `openDialog({ type: "api-response", message })`.
  - `ConfirmActionDialog`'s button calls `onConfirm()` and then `closeDialog()`.
  - `LoadSong.handleLoadSong` opens exactly one `api-response` per outcome. Today it opens one in both `catch` and `finally`.
  - `SaveNewSong`'s unmount cleanup that nulls the message ref goes away.

- [ ] **Step 1: Write the failing tests:**
  - `UIContext.test.tsx` (`renderHook` with `UIProvider` as the wrapper):
    - `dialog` starts `null`.
    - After `openDialog({ type: "api-response", message: "Saved" })`, `dialog` equals that object.
    - After `closeDialog()`, `dialog` is `null`.
    - Open a confirm with `onConfirm: a`, then a second with `onConfirm: b`. `dialog.onConfirm` is `b`.
  - `ConfirmActionDialog.test.tsx`:
    - Render it inside `UIProvider`, after opening the confirm through a small harness component.
    - It shows the message and button text.
    - Clicking the button calls `onConfirm` once, and `dialog` becomes `null`.
- [ ] **Step 2: Run** `pnpm test src/app/contexts/UIContext src/components/Dialogs/ConfirmActionDialog`. Expected: FAIL.
- [ ] **Step 3: Implement**, and convert every caller. Keep `setHotKeysActive` calls as they are; Task 8 removes them.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then `grep -rnE "setShowDialog|MessageRef|confirmActionRef" src`. Expected: PASS, grep prints nothing, and the manual dialog check passes.
- [ ] **Step 5: Commit**
  - Message: "Open dialogs through one typed openDialog call"
  - Body: removes temporal coupling (write the ref, then open) and fixes logout opening a stale confirm.

### Task 8: Derive hotKeysActive and isSelected (audit 2e)

**Files:**
- Modify:
  - `app/contexts/UIContext.tsx`
  - `components/MainMenu.tsx:185–191` (the effect)
  - `DialogWrapper.tsx`, `ConfirmActionDialog.tsx`, `CollectionMenu.tsx`, `KitMenu.tsx`, `StepSequencer.tsx:388, 447`
  - `SaveNewSong.tsx:14` (a commented prop)
  - `components/Audio/DrumPad.tsx:51, 97, 355–358, 367`
- Test: `app/contexts/UIContext.test.tsx`

**Interfaces:**
- Consumes: `dialog`, `openDialog`, `closeDialog` (Task 7)
- Produces: `hotKeysActive: boolean` stays on the context, read-only, computed as `dialog === null`. `setHotKeysActive` is removed. `DrumPad` computes `const isSelected = selectedSampleId === id`.

- [ ] **Step 1: Write the failing tests** in `UIContext.test.tsx`:
  - `hotKeysActive` is `true` at start.
  - It is `false` after `openDialog({ type: "about" })`, and `true` after `closeDialog()`.
  - The context value has no `setHotKeysActive` key (`expect("setHotKeysActive" in result.current).toBe(false)`).
- [ ] **Step 2: Run** `pnpm test src/app/contexts/UIContext`. Expected: FAIL on the last assertion.
- [ ] **Step 3: Implement.** Delete every `setHotKeysActive` call and the MainMenu effect. Replace DrumPad's `isSelected` state, its effect and the `setIsSelected(true)` call with the derived value.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then `grep -rn "setHotKeysActive\|setIsSelected" src`. Expected: PASS, grep prints nothing, and the manual hotkey check passes.
- [ ] **Step 5: Commit**
  - Message: "Compute hotKeysActive and isSelected instead of syncing them"
  - Body: derived state, one source of truth.

### Task 9: API client module (audit 3.12)

**Files:**
- Create: `lib/api/client.ts`, `lib/api/client.test.ts`
- Modify: `components/MainMenu.tsx` (save ~88–137, delete ~139–177, check-login ~193–221), `components/Dialogs/SaveNewSong.tsx`, `components/Dialogs/LoadSong.tsx`, `components/Dialogs/AuthDialog.tsx:6`, `app/contexts/AuthContext.tsx:5–6`, `app/contexts/AudioContext.tsx:30–31`, `frontend-next/package.json` and `pnpm-lock.yaml` (`pnpm remove dotenv`)

**Interfaces:**
- Produces:
  - `export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL`
  - `export const api = axios.create({ baseURL: API_BASE_URL })`
  - `export function apiErrorMessage(err: unknown, fallback: string): string`. It returns `err.response.data.message` when `err` is an AxiosError whose response has a string `message`. Otherwise it returns `fallback`.
  - `export function isServerError(err: unknown): boolean`. It is true only for an AxiosError that has a `response`.
  - Each of these sends `Authorization: Bearer ${token}` and returns `res.data`:
    - `createSong(token, song: SongPayload)`: POST `/beats/me/songs`
    - `updateSong(token, songId, song: SongPayload)`: PUT `/beats/me/songs/${songId}`
    - `deleteSong(token, songId)`: DELETE `/beats/me/songs/${songId}`
    - `listSongTitles(token)`: GET `/beats/me/songs`
    - `getSong(token, songId)`: GET `/beats/me/songs/${songId}`
    - `checkLogin(token)`: GET `/auth/check-login`
  - `type SongPayload = { song: { title: string; loops: AllLoopSettingsFE; samples: Record<string, SampleTypeFE> }; userId: string | null }`
- Rules:
  - Success means the promise resolves. This drops today's `status === 201` / `=== 200` checks, so a 200 from a save no longer fails silently.
  - On error, components show `apiErrorMessage(err, "Something went wrong. Please try again.")`. This replaces the two typo'd fallbacks, and save and delete no longer fail silently.
  - Check-login logs out only when `!data.loggedIn`, or when `isServerError(err)`. A network error stays silent and keeps the user logged in.
  - Remove every `dotenv` import and `dotenv.config()` call.

- [ ] **Step 1: Write the failing tests:**
  - `apiErrorMessage`, given an `AxiosError` built with `response: { data: { message: "Nope" } }`, returns `"Nope"`. Given an `AxiosError` with no response, it returns the fallback. Given `new Error("x")`, it returns the fallback.
  - `isServerError` is `true` for an AxiosError with a response, and `false` for one without.
  - `updateSong("tok", "id1", payload)` calls `api.put` once with `("/beats/me/songs/id1", payload, { headers: { Authorization: "Bearer tok" } })`. Use `vi.spyOn(api, "put").mockResolvedValue({ data: { message: "ok" } })`, and assert it resolves to `{ message: "ok" }`.
- [ ] **Step 2: Run** `pnpm test src/lib/api/client`. Expected: FAIL.
- [ ] **Step 3: Implement**, and convert the callers. Then run `pnpm remove dotenv`, and revert any `pnpm-workspace.yaml` change.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then `grep -rnE "dotenv|NEXT_PUBLIC_API_BASE_URL|Bearer" src`. Expected: PASS. Grep matches only `lib/api/client.ts`. Then do the manual check for save, load, delete and login.
- [ ] **Step 5: Commit**
  - Message: "Move API calls into one client module"
  - Body: DRY. Also show save and delete errors, and drop dotenv, which does nothing in the browser.

### Task 10: One owner per storage key (audit 2c)

**Files:**
- Create: `lib/storage.ts`, `lib/storage.test.ts`
- Modify: `app/contexts/AudioContext.tsx` (~436–465, 580–599), `app/contexts/AuthContext.tsx` (~25–76), `components/MainMenu.tsx` (~58–78, 89, 140, 159–162), `components/Dialogs/SaveNewSong.tsx:49`, `components/Dialogs/LoadSong.tsx:107`, `app/page.tsx:134–137`

**Interfaces:**
- Consumes: `defaultLoopSettings()` (Task 2), the API functions (Task 9)
- Produces:
  - `export type StorageKey = "songId" | "songTitle" | "samples" | "loops" | "token" | "userId" | "username" | "displayName" | "citizenSamplerHasSeenWelcome"`
  - `export function readString(key: StorageKey): string | null`
  - `export function writeString(key: StorageKey, value: string | null): void`. A `null` or `""` value removes the key.
  - `export function readJSON<T>(key: StorageKey): T | null`. It returns `null` on missing or unparsable data.
  - `export function writeJSON(key: StorageKey, value: unknown): void`
  - All four do nothing (or return `null`) when `typeof window === "undefined"`.
  - `AuthContext` gains `logout(): void`. It clears the token, userId, username and displayName, both in state and in storage.
- Rules:
  - `songId`, `songTitle`, `samples` and `loops` are written only by `AudioContext` effects.
    - Add a `songId` effect next to the `songTitle` one.
    - `SaveNewSong` and `LoadSong` call `setSongId` instead of writing storage.
    - `MainMenu` reads `songId` from context. Save with an empty `songId` opens `save-new-song`. Delete with an empty `songId` does nothing.
  - `handleReset` calls `setAllLoopSettings(defaultLoopSettings())` and its existing sample reset, and stops removing keys.
  - Delete success calls `setSongId("")` and `setSongTitle("")`. The effects clear storage.
  - The auth keys are written only by `AuthContext`. `MainMenu.handleLogout` becomes `logout()` plus `router.push("/")`.
  - After this task, `localStorage` appears only in `lib/storage.ts`.

- [ ] **Step 1: Write the failing tests** in `lib/storage.test.ts` (jsdom gives a real `localStorage`; call `localStorage.clear()` in `beforeEach`):
  - After `writeString("songId", "abc")`, `readString("songId")` is `"abc"`.
  - Then `writeString("songId", "")` makes `localStorage.getItem("songId")` `null`, and so does `writeString("songId", null)`.
  - A `writeJSON("loops", { a: 1 })` / `readJSON("loops")` round trip gives `{ a: 1 }`.
  - `localStorage.setItem("loops", "{bad")` makes `readJSON("loops")` return `null`.
- [ ] **Step 2: Run** `pnpm test src/lib/storage`. Expected: FAIL.
- [ ] **Step 3: Implement**, and move every `localStorage` call behind the helpers and the owners above.
- [ ] **Step 4: Run** `pnpm test && npx tsc --noEmit`, then `grep -rn "localStorage" src --include=*.ts --include=*.tsx | grep -v "lib/storage"`. Expected: PASS, and grep prints nothing (test files excepted).
  - Manual check: save a new song, then save again. The second save must PUT, not POST; check the network tab.
  - Load another song, then save. It must PUT to that song's id.
  - Delete, then save. It must open "save new song".
  - Reload the page after each step. `songId` must survive the reload.
- [ ] **Step 5: Commit**
  - Message: "Give each storage key one owner"
  - Body: one source of truth. `songId` no longer goes stale after a save or load.

---

## After the last task

- Update `docs/tpp-refactor-audit.md`. Move the items this plan closes into "Status of earlier findings", so only item 1 (`AudioEngine`) stays open.
- Run the full verification. Then use `superpowers:finishing-a-development-branch` (push and open a PR to `main` for the owner's review).
