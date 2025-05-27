import { Schema, model, HydratedDocument } from "mongoose";
import { SongType } from "../../../shared/types/audioTypes";

// SampleEvent
const SampleEventSchema = new Schema(
  {
    startTime: { type: Number, required: true },
    duration: { type: Number, required: true },
    note: { type: String, required: true },
  },
  { _id: false }
);

// SampleSettings
const SampleSettingsSchema = new Schema(
  {
    mute: { type: Boolean, required: true },
    solo: { type: Boolean, required: true },
    reverse: { type: Boolean, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: false },
    volume: { type: Number, required: true },
    pan: { type: Number, required: true },
    baseNote: { type: String, required: true },
    pitch: { type: Number, required: true },
    attack: { type: Number, required: true },
    release: { type: Number, required: true },
    quantize: { type: Boolean, required: true },
    quantVal: { type: Number, required: true },
    highpass: {
      type: [Schema.Types.Mixed],
      validate: {
        validator: (v: any[]) => Array.isArray(v) && v[1] === "highpass",
        message: "Must be [number, 'highpass', number?]",
      },
      required: true,
    },
    lowpass: {
      type: [Schema.Types.Mixed],
      validate: {
        validator: (v: any[]) => Array.isArray(v) && v[1] === "lowpass",
        message: "Must be [number, 'lowpass', number?]",
      },
      required: true,
    },
  },
  { _id: false }
);

// Sample
const SampleSchema = new Schema(
  {
    id: { type: String, required: true },
    collectionName: { type: String, required: true },
    label: { type: String },
    title: { type: String, required: true },
    url: { type: String, required: true },
    events: {
      type: Map,
      of: [SampleEventSchema],
      required: true,
      default: {},
    },
    settings: { type: SampleSettingsSchema, required: true },
    attribution: { type: String },
  },
  { _id: false }
);

// Loop
const LoopSchema = new Schema({
  beats: {
    type: Number,
    required: true,
  },
  bars: {
    type: Number,
    required: true,
  },
  bpm: {
    type: Number,
    required: true,
  },
  // swing: {
  //   type: Number,
  //   required: true,
  // },
});

// Song
export const SongSchema = new Schema({
  title: { type: String, required: true },
  loops: {
    type: Map,
    of: LoopSchema,
    required: true,
  },
  samples: {
    type: Map,
    of: SampleSchema,
    required: true,
  },
});

export type SongDoc = HydratedDocument<SongType>;

const Song = model<SongDoc>("Song", SongSchema);

export default Song;
