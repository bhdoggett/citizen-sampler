# Plugin DAW workflow: sketch, hand off, multi-out — design

Date: 2026-11-05. Branch: `bhdoggett/plugin-multi-track`.

## Intent

The AU/VST3 plugin currently behaves like the web app inside a DAW: its own
sequencer, its own clock, its own record button, and one stereo output. It
ignores the host transport completely. That leaves the user confused about
how plugin record relates to DAW record, and it gives no way to play one pad
chromatically from its own DAW track.

The new model:

1. **Sketch in the plugin.** Build a beat in the plugin's sequencer, in
   isolation from the rest of the song.
2. **Hand off to the DAW.** Copy the pattern out as MIDI onto DAW tracks.
   From then on the DAW plays the beat by sending MIDI to the instrument.
3. **The plugin is a plain instrument during DAW playback.** It only makes
   sound from incoming MIDI. Its own pattern is never audible while the DAW
   transport is running.

The user's primary host is Logic Pro. Everything below must work in Logic
first; other hosts (Ableton, Reaper, etc.) should work where the same plugin
APIs apply, but are not tested targets.

## Goals

- **Sequencer pattern never plays during DAW playback.**
  - The plugin pattern plays only from the plugin's own play button.
  - When the host transport starts playing, the plugin stops its pattern
    (and its recording) if it was running.
  - While the host is playing, the plugin's play button is disabled.
  - Live MIDI from the host always plays pads, in every state.
- **Tempo follows the host.** In the plugin, the loop BPM is the host tempo,
  read from the playhead every block, even while the host is stopped. The
  BPM control shows the host tempo and is read-only in the plugin.
  - Beats/bars per loop, swing and quantize stay plugin-controlled.
- **Copy pattern to DAW as MIDI.** Two export units:
  - **Whole kit:** every pad in the current loop, one MIDI track.
  - **One pad:** that pad's events in the current loop, with pitch kept.
  - The exported note layout depends on the plugin's output layout (below).
  - Primary mechanism: drag from the plugin UI onto a Logic track, which
    creates a MIDI region. Fallback: an "Export MIDI" button that writes a
    `.mid` file and reveals it in Finder / Explorer. See "Risk: drag-out".
- **Output layout picks the MIDI note layout.** Logic offers Mono, Stereo
  and Multi-Output (16x Stereo) when inserting the instrument.
  - **Mono / Stereo — kit layout.** Any MIDI channel. Notes 36–51 (C1–D#2)
    trigger pads 1–16 at their own pitch. This is today's behavior.
  - **Multi-Output (16x Stereo) — chromatic layout.** MIDI channel N plays
    pad N. The note number is the pitch: MIDI 60 (C4) plays the sample at
    its set pitch, every semitone up or down transposes from there. In
    Logic, the user adds 16 tracks that share the one instance
    (multi-timbral), one per pad, and records each pad's part on its own
    track. Pad N renders to stereo output bus N, and only there. Bus 1
    carries pad 1 only; there is no full-mix bus. Choosing 16 outs means the
    user wants per-sample tracks, so the user routes each output in Logic.
    (User's choice; it also rules out doubled pads.)
- **Pitch grid follows the layout.** In mono/stereo layout the plugin
  sequencer's pitch grid (keyboard mode, which records pitched notes for a
  pad) is greyed out, with a short note: pitched notes need the 16-out
  layout, because in mono/stereo the MIDI note number picks the pad. In
  16-out layout and in the standalone and web apps it works as today.
  (User's choice.)
- **Accounts removed from the plugin.** The DAW project saves the song, so
  the plugin hides Login, Save, Save As and Load Song. Loading sample
  collections stays. (User's choice.)
- **MIDI export in the web app.** The MIDI file builder is written once in
  TypeScript in the shared UI, from the song data the UI already holds. The
  web app downloads a `.mid` file; the plugin hands the same bytes to its
  native side to drag out or save. No C++ MIDI writer.
- **Pad settings stay per pad in every layout.** Pitch, trim, filters,
  envelope, volume, pan, mute/solo apply to MIDI-triggered notes exactly as
  they do to sequencer notes.
- **The UI follows incoming MIDI.** A pad lights up when host MIDI triggers
  it, in either layout.
- **The UI knows its context.** The plugin tells the UI: running as plugin
  vs standalone, the output layout (kit vs chromatic), host tempo, and host
  playing state. The UI uses this to disable play/record during host
  playback, show the host BPM, and label export/drag actions with the
  right layout.
- **App icon** (done on this branch): the standalone app and plugin bundles
  use `engine/juce/assets/app-icon.png`, rendered from `app-icon.svg`, which
  is the web favicon on the macOS rounded-tile grid.

## Non-goals

- No start/stop or bar-position sync with the host. The plugin pattern
  never plays along with the song.
- No overdubbing the plugin pattern over the DAW song.
- No plugin MIDI output. Logic does not record MIDI an instrument sends, so
  this would not help. `NEEDS_MIDI_OUTPUT` stays `FALSE`.
- Standalone desktop app saving. The desktop app will also drop accounts
  and save songs locally, with the same Save / Save As / Load Song menu as
  the web plus a "Reveal songs folder" item. That is a separate short
  design, done after this one. (User's choice.)
- No way to bring a web or account song into the plugin (no song file
  export/import). Deferred by the user.
- No change to the web app or the standalone desktop app's sequencer
  behavior, apart from the web app's new MIDI export. Standalone has no host, so it keeps its own BPM and transport.
- No new pitch-shifting engine. Chromatic notes reuse the existing per-pad
  time-preserving pitch shift plus the note transpose the engine already
  applies to `Press` notes.

## Anti-goals

- Doubled hits: plugin pattern and DAW region both triggering the same pad.
  The "never audible during host playback" rule exists to make this
  impossible.
- Breaking existing sessions: plugin IDs, `PLUGIN_CODE`, and saved state
  format must keep loading. A session saved before this change must open
  with a stereo layout and kit mapping, and sound the same.
- Audio-thread allocation or locking beyond today's `try_lock` pattern.

## Constraints

- JUCE 8, CMake, Ninja. Engine core is single-threaded behind one mutex
  (`engine/juce/PluginProcessor.h`).
- The UI is the shared React app in a WebView; plugin-only UI is gated on
  the context the plugin reports, not on build flags.
- Event start times are ticks at 192 PPQ; durations are seconds
  (`engine/core/include/citizen/Types.h`). MIDI export converts durations
  to ticks at the host tempo.
- Logic decides the bus layout at insert time. Changing Mono/Stereo to
  Multi-Output means re-inserting the plugin. The plugin must handle the
  layout it is given at `prepareToPlay` and when the host changes layout.

## Decisions made in conversation

- 16-out layout: each pad on its own output only, no full-mix bus.
- Pitch grid greyed out with an explanation in mono/stereo layout.
- Plugin drops accounts. Desktop app saving is a separate design.

- Chromatic pad playing comes from per-pad DAW tracks on MIDI channels 1–16.
- Note layout is tied to output layout: mono/stereo = kit, 16-out =
  chromatic. (User's choice.)
- Sequencer is kept as a sketchpad; patterns are copied to the DAW as MIDI.
- Building beats in isolation from the song is acceptable.
- Plugin pattern is never audible during DAW playback.

## Calls made by the designer (check these)

- Host transport starting stops the plugin pattern and disables plugin
  play/record while the host plays.
- Host tempo overrides loop BPM in the plugin; BPM control read-only there.
  The override is runtime only: each loop's stored `LoopTiming.bpm` is kept
  in the song and saved state, and is used again in the web and standalone
  apps. The engine owns the override; the saved state format does not change.
- Swing is baked into exported note positions, so the DAW region sounds
  like the plugin pattern.
- Exported velocity comes from each event's stored velocity; length from its
  stored duration (or the pad's sample length for one-shot pads).
- In chromatic layout, the whole-kit export still produces one region with
  each pad's notes on its own MIDI channel. Whether Logic preserves those
  channels when dropped onto one track of a multi-timbral instrument is
  unknown; the spike below tests it. If Logic re-channels events to the
  track, whole-kit export in chromatic layout becomes "one region per pad"
  (a multi-track `.mid`), or is disabled in favour of per-pad export.
- Clicking pads in the plugin UI still auditions sound. These
  clicks are not recorded by the DAW; this is a Logic limit, not a bug.
- Plugin record (the sequencer's record button) keeps working while the
  host is stopped.
- Pitched notes that already exist in mono/stereo layout (from a session
  saved before this change) are kept in the song. They play and export at
  the pad's kit note, and the export shows a warning that pitch was dropped.
- Clicking the on-screen pitch keys still auditions pitched sound in every
  layout; only recording into the pitch grid is greyed out.
- "Ignore the export from web" was read as deferring web-song-to-plugin
  transfer. Web MIDI export stays in scope.

## Risk: drag-out (spike first)

Dragging a MIDI file out of a plugin is common (JUCE:
`DragAndDropContainer::performExternalDragDropOfFiles` with a temp `.mid`).
Unknown here: starting a native drag from inside the WebView UI, hosted in
Logic's plugin window, on macOS and Windows.

Before building export UI, a throwaway spike must answer:

1. Can a mouse-down in the WebView start a native file drag that Logic
   accepts as a MIDI region on a track?
2. In chromatic layout, does a dropped region keep per-event MIDI channels
   on a multi-timbral track?
3. Does dropping a multi-track `.mid` create one region per track?

If (1) fails, ship the "Export MIDI" button as the only path. The button
ships either way as a fallback.

## Left to the builder

- Exact bus naming (e.g. "Pad 1".."Pad 16") and whether aux buses default
  enabled or disabled.
- How host context reaches the UI: a new event type on the existing event
  stream (`takeEvents`) is the expected route; shape is the builder's call.
- How the engine renders per-pad outputs (e.g. `PadChannel` writing to a
  per-pad buffer, summed into the main bus as needed).
- UI placement of drag handles / export buttons and disabled-state styling,
  using existing CSS modules and tokens.
- Temp file location and cleanup for exported `.mid` files.
- Test strategy: core tests for MIDI mapping, export (ticks, swing,
  channels), and the host-playing gate; wire tests for new events; manual
  Logic checklist for layouts, drag-out and session restore.
