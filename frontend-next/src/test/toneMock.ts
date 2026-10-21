// Minimal stand-in for the parts of Tone.js the audio utils use.
// jsdom has no Web Audio API, so the real Transport can't be created in tests.
const PPQ = 192;

export const transport = {
  bpm: { value: 120 },
  PPQ,
  loopStart: 0 as number | string,
  loopEnd: "2m" as number | string,
  seconds: 0,
};

const secondsPerBeat = () => 60 / transport.bpm.value;

const timeToSeconds = (value: number | string): number => {
  if (typeof value === "number") return value;
  const measures = value.match(/^(\d+(?:\.\d+)?)m$/);
  if (measures) return Number(measures[1]) * 4 * secondsPerBeat();
  return Number(value);
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const noteToMidi = (note: string): number => {
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) throw new Error(`Unsupported note in mock: ${note}`);
  return NOTE_NAMES.indexOf(match[1]) + (Number(match[2]) + 1) * 12;
};

const midiToNote = (midi: number) =>
  `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

export const toneMock = {
  getTransport: () => transport,
  Ticks: (ticks: number) => ({
    toSeconds: () => (ticks / PPQ) * secondsPerBeat(),
  }),
  Time: (value: number | string) => ({
    toSeconds: () => timeToSeconds(value),
  }),
  Frequency: (value: string | number, units?: "midi") => {
    const midi = units === "midi" ? Number(value) : noteToMidi(String(value));
    return {
      toMidi: () => midi,
      toNote: () => midiToNote(midi),
      toFrequency: () => 440 * Math.pow(2, (midi - 69) / 12),
    };
  },
};

export const resetTransport = () => {
  transport.bpm.value = 120;
  transport.loopStart = 0;
  transport.loopEnd = "2m";
  transport.seconds = 0;
};
