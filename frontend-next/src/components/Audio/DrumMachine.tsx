import React, { useRef } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import DrumPad from "./DrumPad";
import { ALL_PAD_IDS } from "src/lib/constants/padLayout";
import useTouchPads, { type PadHandlers } from "src/app/hooks/useTouchPads";
import styles from "./DrumMachine.module.css";

const DrumMachine = () => {
  const { samplers } = useAudioContext();
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
          const samplerObj = samplers[id];
          return (
            <DrumPad
              key={id}
              id={id}
              sampler={samplerObj?.sampler ?? null}
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
