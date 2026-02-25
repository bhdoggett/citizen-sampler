"use client";

const HelpShortcuts: React.FC = () => {
  return (
    <section className="max-w-3xl mx-auto px-4 py-2 text-gray-200 max-h-[65vh] overflow-y-auto rounded-lg">
      <h2 className="text-3xl font-bold mb-4">Controls &amp; Shortcuts</h2>

      {/* Global transport & navigation */}
      <h3 className="text-xl font-semibold mt-2 mb-1">
        Global transport &amp; navigation
      </h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-3">
        <li>
          <strong>Play / Stop loop</strong>: <code>Spacebar</code>
        </li>
        <li>
          <strong>Toggle record</strong>: <code>Ctrl + R</code>
        </li>
        <li>
          <strong>Toggle metronome</strong>: <code>M</code>
        </li>
        <li>
          <strong>Show Sequencer</strong>: <code>Shift + S</code>
        </li>
        <li>
          <strong>Show Pads</strong>: <code>Shift + P</code>
        </li>
        <li>
          <strong>Switch Pads &lt;→&gt; Sequencer</strong>: use the vertical
          buttons beside the grid (or <code>Shift + S / Shift + P</code>).
        </li>
        <li>
          <strong>Select Loop A/B/C/D</strong>:{" "}
          <code>Shift + A / B / C / D</code>
        </li>
        <li>
          <strong>Toggle Quantize for selected pad</strong>:{" "}
          <code>Shift + Q</code>
        </li>
        <li>
          <strong>Open Controls &amp; Shortcuts</strong>: <code>Shift + /</code>{" "}
          (or click the Help item in the main menu)
        </li>
      </ul>

      {/* Drum Pads & Pitch Grid */}
      <h3 className="text-xl font-semibold mt-2 mb-1">
        Drum Pads &amp; Pitch Grid
      </h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-3">
        <li>
          <strong>Trigger pads</strong>: click/tap a pad, or press its key (the
          letter in the pad corner, e.g.{" "}
          <code>Q W E R / A S D F / Z X C V</code> and arrow keys for pads
          13–16).
        </li>
        <li>
          <strong>Play pitched notes</strong>: use the Pitch Grid next to the
          pads to play and record the selected sample across two octaves.
        </li>
        <li>
          <strong>Recording from pads / Pitch Grid</strong>: enable record,
          start the loop, then play pads or notes; events are captured into the
          current loop.
        </li>
      </ul>

      {/* Step Sequencer */}
      <h3 className="text-xl font-semibold mt-2 mb-1">Step Sequencer</h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-3">
        <li>
          <strong>Add / remove events</strong>: click in a grid cell to add an
          event; click an event to delete it.
        </li>
        <li>
          <strong>Move events</strong>: drag an event left/right (snap to grid
          can be toggled).
        </li>
        <li>
          <strong>Resize events</strong>: drag the left or right edge of an
          event to change its length.
        </li>
        <li>
          <strong>Pitched (piano-roll) mode</strong>: click the music-note
          button ({"\u266B"}) in the Sequencer header to toggle piano-roll view
          for the selected pad and program re-pitched notes/beats for that
          sample across a musical scale.
        </li>
        <li>
          <strong>Velocity editing</strong>: hold <code>Ctrl</code>, then click
          and drag the thin horizontal line inside an event to change its
          velocity (up = louder, down = softer).
        </li>
        <li>
          <strong>Draw velocity across a row</strong>: with <code>Ctrl</code>{" "}
          held, drag across multiple events; each event you pass over will match
          the cursor&apos;s vertical position so you can sketch rising or
          falling dynamics.
        </li>
        <li>
          <strong>Clear events on selected pad</strong>: <code>Delete</code> or{" "}
          <code>Backspace</code>
        </li>
        <li>
          <strong>Zoom in / out (Sequencer)</strong>: <code>+</code> /{" "}
          <code>=</code> to zoom in,
          <code>-</code> to zoom out.
        </li>
      </ul>

      {/* Sample settings */}
      <h3 className="text-xl font-semibold mt-2 mb-1">Sample settings</h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-3">
        <li>
          <strong>Waveform zoom &amp; region</strong>: zoom in on the waveform
          and drag the start/end handles to choose which part of the sample
          plays when you hit the pad or sequence it.
        </li>
        <li>
          <strong>Base note &amp; pitch</strong>: set the sample&apos;s base
          note (used for re-pitching in the Pitch Grid and piano-roll) and
          fine-tune pitch in semitones/cents.
        </li>
        <li>
          <strong>Filters</strong>: use HP/LP sliders to sculpt the high/low
          frequencies of the sample.
        </li>
        <li>
          <strong>Envelope &amp; level</strong>: adjust volume, pan, attack, and
          release to control how quickly the sound starts, stops, and where it
          sits in the stereo field.
        </li>
        <li>
          <strong>Quantize</strong>: toggle quantize for the selected pad and
          choose a subdivision to have newly recorded events snap to the grid
          (also accessible with <code>Shift + Q</code>).
        </li>
      </ul>

      {/* Loops & patterns */}
      <h3 className="text-xl font-semibold mt-2 mb-1">Loops &amp; patterns</h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-3">
        <li>
          <strong>Loop buttons A–D</strong>: switch between up to four loop
          patterns that share the same pads and settings.
        </li>
        <li>
          <strong>Tempo &amp; swing</strong>: adjust BPM and swing in the Loop
          panel; changes apply to the whole song.
        </li>
        <li>
          <strong>Beats &amp; bars</strong>: change time signature and loop
          length; stop playback before changing beats/bars.
        </li>
      </ul>

      {/* Saving & stems */}
      <h3 className="text-xl font-semibold mt-2 mb-1">
        Saving, loading, &amp; stems
      </h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-4">
        <li>
          <strong>Save / Save As / Load Song</strong>: use the main menu in the
          top-right to manage songs (requires an account to save).
        </li>
        <li>
          <strong>Download stems</strong>: choose “Download Stems” in the main
          menu to render and download audio stems for each pad.
        </li>
      </ul>

      <p className="text-xs text-gray-400">
        New to Citizen Sampler? Start by loading a collection, pressing{" "}
        <code>Space</code> to play the loop, and tapping the pads in time.
        Enable record to capture your beats to the current loop. When
        you&apos;re ready to fine-tune, switch to the Sequencer to adjust timing
        and Ctrl+drag velocity to shape your groove.
      </p>
    </section>
  );
};

export default HelpShortcuts;
