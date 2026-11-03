import type { TransportEvent } from "./protocol";

// The last transport event plus when it arrived, in performance.now() ms
export type TransportAnchor = TransportEvent & { receivedAt: number };

// Seconds into the loop at `now`, worked out from the anchor rather than
// read from the engine, so playheads need no traffic across the boundary.
export function currentPosition(anchor: TransportAnchor, now: number): number {
  if (anchor.loopDuration <= 0) return 0;
  if (!anchor.playing) return anchor.position;
  const elapsed = Math.max(0, now - anchor.receivedAt) / 1000;
  return (anchor.position + elapsed) % anchor.loopDuration;
}
