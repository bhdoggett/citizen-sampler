import type * as Tone from "tone";
import quantize from "./quantize";
import { loopDurationSeconds, ticksToSeconds, type LoopTiming } from "./timing";
import type { SampleTypeFE } from "src/types/audioTypesFE";
import type { LoopName } from "src/types/audioTypes";

type SampleEvent = {
  startTime: number;
  duration: number | null;
  note: Tone.Unit.Frequency;
  velocity: number;
};

type ScheduleEvent = [number, SampleEvent];

type SchedulablePad = Pick<SampleTypeFE, "events" | "settings">;

export type { LoopTiming };

// Tone.Part hands its callback an untyped value; this narrows it to an
// event that can be triggered
export function isPlayableEvent(
  event: unknown
): event is SampleEvent & { duration: number } {
  return (
    typeof event === "object" &&
    event !== null &&
    "duration" in event &&
    event.duration != null
  );
}

// timing is the tempo and length of the loop being scheduled. Loops always start at 0.
const getScheduleEvents = (
  sampleData: SchedulablePad,
  currentLoop: LoopName,
  timing: LoopTiming
): ScheduleEvent[] => {
  const loopStart = 0;
  const loopEnd = loopDurationSeconds(timing);

  const events = (sampleData.events[currentLoop] ?? [])
    .map((event) => {
      // Check for null/undefined but allow 0 (start of loop)
      if (event.startTime == null) return;

      // Convert startTime from ticks to seconds
      const startTimeInSeconds = ticksToSeconds(event.startTime, timing.bpm);

      // If quantize === true, quantize the start time
      // Otherwise, use the start time as is
      let eventTime = sampleData.settings.quantize
        ? quantize(startTimeInSeconds, sampleData.settings.quantVal, timing.bpm)
        : startTimeInSeconds;

      // If an event is quantized to the loop end, wrap it to the loop start.
      // Compare with a tolerance: the snapped time and the loop length can
      // differ in the last float digit.
      if (Math.abs(eventTime - loopEnd) < 1e-9) {
        eventTime = loopStart;
      }

      return [
        eventTime,
        {
          startTime: eventTime,
          duration: event.duration,
          note: event.note,
          velocity: event.velocity,
        },
      ];
    })
    .filter((e): e is ScheduleEvent => !!e);

  // Filter out undefined events and remove events that occur at the same start time AND same note
  return events.filter((event, index, arr) => {
    if (!event) return false;
    // Check if there is a previous event with the same start time and note
    for (let i = 0; i < index; i++) {
      if (
        arr[i] &&
        arr[i][0] === event[0] &&
        arr[i][1].note === event[1].note
      ) {
        return false;
      }
    }
    return true;
  });
};

export default getScheduleEvents;
