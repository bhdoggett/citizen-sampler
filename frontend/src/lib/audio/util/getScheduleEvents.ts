import * as Tone from "tone";
import quantize from "./quantize";
import type { SampleTypeFE } from "src/types/audioTypesFE";

type SampleEvent = {
  startTime: number;
  duration: number | null;
  note: Tone.Unit.Frequency;
  velocity: number;
};

type ScheduleEvent = [number, SampleEvent];

type AllSampleData = Record<string, SampleTypeFE>;

const getScheduleEvents = (
  allSampleData: AllSampleData,
  id: string,
  currentLoop: string
): ScheduleEvent[] => {
  const sampleData = allSampleData[id];

  const events = sampleData.events[currentLoop]
    .map((event) => {
      if (!event.startTime) return;

      // Convert startTime from ticks to seconds
      const startTimeInSeconds = Tone.Ticks(event.startTime).toSeconds();

      // If quantize === true, quantize the start time
      // Otherwise, use the start time as is
      let eventTime = sampleData.settings.quantize
        ? quantize(startTimeInSeconds, sampleData.settings.quantVal)
        : startTimeInSeconds;

      // If an event is quantied to the loop end, wrap it to the loop start
      if (eventTime === Tone.Time(Tone.getTransport().loopEnd).toSeconds()) {
        eventTime = Tone.Time(Tone.getTransport().loopStart).toSeconds();
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

  // Filter out undefined events and remove events that occur at the same start time
  // This is a common issue with quantization
  const eventsNoDuplicates = events.filter((event, index) => {
    if (event?.[0] === events[index - 1]?.[0]) return false;
    return true;
  });

  if (!eventsNoDuplicates || eventsNoDuplicates.length === 0) {
    console.warn(
      `No valid events found for sample ID ${id} in loop ${currentLoop}.`
    );
    return [];
  }
  return eventsNoDuplicates;
};

export default getScheduleEvents;
