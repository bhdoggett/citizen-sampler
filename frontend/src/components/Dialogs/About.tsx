"use client";

const About: React.FC = () => {
  return (
    <section className="max-w-3xl mx-auto px-4 py-2 text-gray-200 max-h-[80vh] overflow-y-auto rounded-lg ">
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

      <p className="mb-4">
        By default, Drum Pads 1–12 are loaded with samples from curated Library
        of Congress collections, and Pads 13–16 are loaded with sounds from
        classic drum machines. But any sample can be individually loaded to any
        pad. You can customize each sample, adjust pitch and playback settings,
        and record loops in real-time. Drum Pads can be triggered with your
        mouse, touch, or by the keyboard keys indicated in the top right corner
        of each pad.
      </p>

      <p className="mb-4">
        Use the <strong>Pitch Grid</strong> to play and records samples
        repitched across two octaves.
      </p>

      <p className="mb-4">
        In the <strong>Sample Settings</strong> section, zoom in on waveforms,
        tweak start and end points, and shape your sound with filters, volume,
        pan, attack, and release.
      </p>

      <p className="mb-4">
        The <strong>Transport Controls</strong> let you play, record, and stop
        your loop, as well as enable a metronome. Loop hotkeys: Use{" "}
        <strong>spacebar</strong> to start and stop the loop,{" "}
        <strong>ctrl + r</strong> to toggle record, and <strong>m</strong> to
        toggle the metronome.
      </p>

      <p className="mb-4">
        The <strong>Loop Section</strong> allows you to adjust tempo, swing, and
        time signature. You can save songs by creating an account, and export
        individual audio stems when you&#39;re ready.
      </p>

      <p className="mb-6">
        Whether you&#39;re a seasoned producer or just starting out, Citizen
        Sampler provides a hands-on, expressive tool for crafting unique,
        sample-based music.
      </p>

      <a
        href="https://github.com/bhdoggett/citizen-sampler"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline"
      >
        View on GitHub
      </a>
    </section>
  );
};

export default About;
