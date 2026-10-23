"use client";
import styles from "./Dialog.module.css";

import { useUIContext } from "src/app/contexts/UIContext";

const About: React.FC = () => {
  const { setShowDialog } = useUIContext();

  const openHelp = () => {
    setShowDialog("help-shortcuts");
  };

  return (
    <section className={styles.prose}>
      <h2>About Citizen Sampler</h2>

      <p>
        <strong>Citizen Sampler</strong> is an MPC-style web instrument inspired
        by the{" "}
        <a
          href="https://citizen-dj.labs.loc.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Citizen DJ project
        </a>{" "}
        at the Library of Congress. It allows musicians and beatmakers to create
        original loops using a wide selection of public-domain and Creative
        Commons samples.
      </p>

      <hr className={styles.rule} />

      <p>
        By default, <strong>Drum Pads</strong> 1–12 are loaded with samples from
        curated Library of Congress collections and Pads 13–16 are loaded with
        sounds from classic drum machines, but any sample can be individually
        loaded to any pad. Play the pads with your mouse, touch, or the keyboard
        keys indicated in the top right corner of each pad.
      </p>

      <p>
        Use the <strong>Pitch Grid</strong> to play and record samples repitched
        across two octaves.
      </p>

      <p>
        In the <strong>Sample Settings</strong> section, you can zoom in on
        waveforms, tweak start and end points, adjust the sample&#39;s base
        note, and shape your sound with filters, volume, pan, attack, and
        release. Use <strong>Quantize</strong> when you want your recorded hits
        locked tightly to the grid.
      </p>

      <p>
        The <strong>Transport Controls</strong> let you play, record, and stop
        your loop, as well as enable a metronome, while the{" "}
        <strong>Loop Section</strong> adjusts tempo, swing, and time signature
        for up to four patterns (A, B, C, D).
      </p>

      <p>
        All users can build a beat and download wav stems. Create an account to
        save and recall multiple songs.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={openHelp}
          className={styles.button}
        >
          See Controls &amp; Shortcuts
        </button>
      </div>

      <hr className={styles.rule} />

      <p>
        Whether you&#39;re a seasoned producer or just starting out, Citizen
        Sampler provides a hands-on, expressive tool for crafting unique,
        sample-based music.
      </p>

      <p className={styles.linkRow}>
        <a href="mailto:citizensampler@gmail.com?subject=Feedback">
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
