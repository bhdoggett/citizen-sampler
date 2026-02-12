import React, { memo } from "react";

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
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
        style={{
          left: `${labelColumnWidth + position * cellWidth}px`,
          transition: "none",
        }}
      />
    );
  }
);

SequencerPlayhead.displayName = "SequencerPlayhead";

export default SequencerPlayhead;
