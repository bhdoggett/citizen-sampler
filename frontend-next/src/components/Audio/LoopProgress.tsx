import { useEffect, useState } from "react";
import { useTransportAnchor } from "src/lib/engine/react";
import { currentPosition } from "src/lib/engine/transportClock";
import type { CSSProperties } from "react";
import styles from "./LoopProgress.module.css";

const LoopProgressBar = () => {
  const anchor = useTransportAnchor();
  const [progress, setProgress] = useState(0);

  // Worked out from the last transport anchor each frame, so nothing is read
  // from the engine while playing
  useEffect(() => {
    if (anchor.loopDuration <= 0) return;
    if (!anchor.playing) {
      setProgress(anchor.position / anchor.loopDuration);
      return;
    }
    let frame = 0;
    const update = () => {
      setProgress(currentPosition(anchor, performance.now()) / anchor.loopDuration);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [anchor]);

  return (
    <div
      className={styles.track}
      style={{ "--progress": progress } as CSSProperties}
    >
      <div className={styles.fill} />
    </div>
  );
};

export default LoopProgressBar;
