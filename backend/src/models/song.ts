import { Schema, model } from "mongoose";

type Filter = [number, "highpass" | "lowpass", number];

const SampleSettingsSchema = new Schema({
  mute: { type: Boolean, required: true },
  solo: { type: Boolean, required: true },
  reverse: { type: Boolean, required: true },
  volume: { type: Number, required: true },
  pan: { type: Number, required: true },
  baseNote: { type: String, required: true },
  pitch: { type: Number, required: true },
  attack: { type: Number, required: true },
  release: { type: Number, required: true },
  quantize: { type: Boolean, required: true },
  quantVal: { type: Number, required: true },
  highpass: {
    type: [Number, String, Number],
    validate: {
      validator: (v: Filter) => v.length >= 2 && v[1] === "highpass",
      message: "highpass must be an array with 'highpass' at index 1",
    },
    required: true,
  },
  lowpass: {
    type: [Schema.Types.Mixed],
    validate: {
      validator: (v: Filter) => v.length >= 2 && v[1] === "lowpass",
      message: "lowpass must be an array with 'lowpass' at index 1",
    },
    required: true,
  },
});

const SampleEvent = new Schema({
  startTime: { type: Number, required: true },
  duration: { type: Number, required: true },
  note: { type: String, required: true },
  velocity: { type: Number, required: true },
});

const SamplerSchema = new Schema({
  id: { type: String, required: true },
  collection: { type: String, required: true },
  label: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  events: { type: [SampleEvent], required: true },
  settings: { type: SampleSettingsSchema, required: true },
  details: { type: String, required: true },
});

export const SongSchema = new Schema({
  title: { type: String, required: true },
  samples: { type: [SamplerSchema], required: true },
  transport: {
    bpm: { type: Number, required: true },
    beatsPerBar: { type: Number, required: true },
    loopLength: { type: Number, required: true },
  },
});

export const Song = model("Song", SongSchema);

export default Song;
