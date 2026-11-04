import React, { useRef } from "react";
import DrumPad from "./DrumPad";
import { ALL_PAD_IDS } from "src/lib/constants/padLayout";
import useTouchPads, { type PadHandlers } from "src/app/hooks/useTouchPads";
import styles from "./DrumMachine.module.css";

const DrumMachine = () => {
  // Ref for imperative handles
  const drumPadsHandlersRef = useRef<Record<string, PadHandlers | null>>({});
  const drumPadsButtonRef = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  useTouchPads(drumPadsButtonRef, drumPadsHandlersRef);

  return (
    <div className={styles.drumMachine}>
      <div className={styles.grid}>
        {ALL_PAD_IDS.map((id) => {
          return (
            <DrumPad
              key={id}
              id={id}
              ref={(el) => {
                drumPadsHandlersRef.current[id] = el as PadHandlers | null;
              }}
              buttonRef={(el) => {
                drumPadsButtonRef.current[id] = el;
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DrumMachine;
