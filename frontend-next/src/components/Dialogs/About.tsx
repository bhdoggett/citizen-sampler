"use client";

import { useUIContext } from "src/app/contexts/UIContext";

const About: React.FC = () => {
  const { setShowDialog } = useUIContext();

  const openHelp = () => {
    setShowDialog("help-shortcuts");
  };

  return (
    <section className="max-w-3xl mx-auto px-4 py-2 text-gray-200 max-h-[65vh] overflow-y-auto rounded-lg ">
      <h2 className="text-3xl font-bold mb-4">About Citizen Sampler</h2>

      <p className="mb-4">
        <strong>Citizen Sampler</strong> is an MPC-style web instrument inspired
        by the{" "}
        <a
          href="https://citizen-dj.labs.loc.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          Citizen DJ project
        </a>{" "}
        at the Library of Congress. It allows musicians and beatmakers to create
        original loops using a wide selection of public-domain and Creative
        Commons samples.
      </p>

      <hr className="mx-auto w-1/3 mb-4" />

      <p className="mb-4">
        By default, <strong>Drum Pads</strong> 1–12 are loaded with samples from
        curated Library of Congress collections and Pads 13–16 are loaded with
        sounds from classic drum machines, but any sample can be individually
        loaded to any pad. Play the pads with your mouse, touch, or the keyboard
        keys indicated in the top right corner of each pad.
      </p>

      <p className="mb-4">
        Use the <strong>Pitch Grid</strong> to play and record samples repitched
        across two octaves.
      </p>

      <p className="mb-4">
        In the <strong>Sample Settings</strong> section, you can zoom in on
        waveforms, tweak start and end points, adjust the sample&#39;s base
        note, and shape your sound with filters, volume, pan, attack, and
        release. Use <strong>Quantize</strong> when you want your recorded hits
        locked tightly to the grid.
      </p>

      <p className="mb-4">
        The <strong>Transport Controls</strong> let you play, record, and stop
        your loop, as well as enable a metronome, while the{" "}
        <strong>Loop Section</strong> adjusts tempo, swing, and time signature
        for up to four patterns (A, B, C, D).
      </p>

      <p className="mb-4">
        All users can build a beat and download wav stems. Create an account to
        save and recall multiple songs.
      </p>

      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={openHelp}
          className="border border-blue-300 px-3 py-1 rounded text-sm text-blue-200 hover:bg-blue-200 hover:text-slate-900 transition-colors"
        >
          See Controls &amp; Shortcuts
        </button>
      </div>

      <hr className="mx-auto w-1/3 mb-4" />

      <p className="mb-6">
        Whether you&#39;re a seasoned producer or just starting out, Citizen
        Sampler provides a hands-on, expressive tool for crafting unique,
        sample-based music.
      </p>

      <p className="flex justify-center mx-auto text-blue-400 underline text-sm">
        <a
          href="mailto:citizensampler@gmail.com?subject=Feedback"
          className="border-r pr-2 mr-2"
        >
          Feedback
        </a>
        <a
          href="https://github.com/bhdoggett/citizen-sampler"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
      </p>
    </section>
  );
};

export default About;
