import React, { memo } from "react";
import styles from "./SequencerPlayhead.module.css";

type SequencerPlayheadProps = {
  position: number;
  cellWidth: number;
  labelColumnWidth: number;
};

const SequencerPlayhead: React.FC<SequencerPlayheadProps> = memo(
  ({ position, cellWidth, labelColumnWidth }) => {
    if (position <= 0) return null;

    return (
      <div
        className={styles.playhead}
        style={{ left: `${labelColumnWidth + position * cellWidth}px` }}
      />
    );
  }
);

SequencerPlayhead.displayName = "SequencerPlayhead";

export default SequencerPlayhead;
