"use client";

import { useUIContext } from "src/app/contexts/UIContext";

const Welcome: React.FC = () => {
  const { setShowDialog } = useUIContext();

  const handleClose = () => {
    setShowDialog(null);
  };

  const handleGoToHelp = () => {
    setShowDialog("help-shortcuts");
  };

  return (
    <section className="max-w-xl mx-auto px-4 py-2 text-gray-200 max-h-[65vh] overflow-y-auto rounded-lg">
      <h2 className="text-3xl font-bold mb-4">Welcome to Citizen Sampler</h2>

      <p className="mb-3 text-sm">
        Citizen Sampler is an MPC-style web instrument for building loops from
        public-domain and Creative Commons samples. Here&apos;s the 10‑second
        tour:
      </p>

      <ol className="list-decimal list-inside text-sm space-y-2 mb-4">
        <li>
          <strong>PADS</strong>: trigger sounds with your keyboard or mouse
          while the loop plays to record a performance.
        </li>
        <li>
          <strong>SEQUENCER</strong>: switch to the Sequencer view to place,
          move, and resize events on a grid for precise editing.
        </li>
        <li>
          <strong>Power tips</strong>: use <code>Space</code> to start/stop,{" "}
          <code>Ctrl + R</code> to enable record, <code>Shift + A/B/C/D</code>{" "}
          to change loops, and hold <code>Ctrl</code> in the Sequencer to drag
          the thin line on notes and draw velocity across a row.
        </li>
      </ol>

      <p className="mb-4 text-sm">
        When you&apos;re ready, open the full{" "}
        <button
          type="button"
          onClick={handleGoToHelp}
          className="underline text-blue-300 hover:text-blue-200"
        >
          Controls &amp; Shortcuts
        </button>{" "}
        for a complete list of keys and tricks.
      </p>

      <div className="flex justify-end gap-2 mt-4 text-sm">
        <button
          type="button"
          onClick={handleClose}
          className="border border-white px-3 py-1 rounded hover:bg-white hover:text-slate-900 transition-colors"
        >
          Start playing
        </button>
      </div>
    </section>
  );
};

export default Welcome;
