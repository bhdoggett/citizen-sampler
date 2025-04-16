import * as Tone from "tone";

const metronome = new Tone.Sampler({
  urls: { C6: "hi-block.wav", G5: "lo-block.wav" },
  baseUrl: "/samples/metronome/",
}).toDestination();

export default metronome;
