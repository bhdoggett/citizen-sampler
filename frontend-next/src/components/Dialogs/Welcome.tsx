"use client";
import styles from "./Dialog.module.css";

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
    <section className={styles.prose}>
      <h2>Welcome to Citizen Sampler</h2>

      <p>
        Citizen Sampler is an MPC-style web instrument for building loops from
        public-domain and Creative Commons samples. Here&apos;s the 10‑second
        tour:
      </p>

      <ol>
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

      <p>
        When you&apos;re ready, open the full{" "}
        <button
          type="button"
          onClick={handleGoToHelp}
          className={styles.link}
        >
          Controls &amp; Shortcuts
        </button>{" "}
        for a complete list of keys and tricks.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleClose}
          className={`${styles.button} ${styles.primary}`}
        >
          Start playing
        </button>
      </div>
    </section>
  );
};

export default Welcome;
