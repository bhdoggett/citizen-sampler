"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongSchema = void 0;
const mongoose_1 = require("mongoose");
// SampleEvent
const SampleEventSchema = new mongoose_1.Schema({
    startTime: { type: Number, required: true },
    duration: { type: Number, required: true },
    note: { type: String, required: true },
    velocity: { type: Number, required: true },
}, { _id: false });
// SampleSettings
const SampleSettingsSchema = new mongoose_1.Schema({
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
        type: [mongoose_1.Schema.Types.Mixed],
        validate: {
            validator: (v) => Array.isArray(v) && v[1] === "highpass",
            message: "Must be [number, 'highpass', number?]",
        },
        required: true,
    },
    lowpass: {
        type: [mongoose_1.Schema.Types.Mixed],
        validate: {
            validator: (v) => Array.isArray(v) && v[1] === "lowpass",
            message: "Must be [number, 'lowpass', number?]",
        },
        required: true,
    },
}, { _id: false });
// Sample
const SampleSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    collectionName: { type: String, required: true },
    label: { type: String },
    title: { type: String, required: true },
    url: { type: String, required: true },
    events: {
        type: Object,
        of: [SampleEventSchema],
        required: true,
        default: {},
    },
    settings: { type: SampleSettingsSchema, required: true },
    attribution: { type: String },
}, { _id: false });
// Loop
const LoopSchema = new mongoose_1.Schema({
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
    swing: {
        type: Number,
        required: true,
    },
});
// Song
exports.SongSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    loops: {
        type: Object,
        of: LoopSchema,
        required: true,
    },
    samples: {
        type: Object,
        of: SampleSchema,
        required: true,
    },
});
const Song = (0, mongoose_1.model)("Song", exports.SongSchema);
exports.default = Song;
