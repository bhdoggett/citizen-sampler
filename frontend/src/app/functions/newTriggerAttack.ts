import {
  Frequency,
  Interval,
  MidiNote,
  NormalRange,
  Note,
  Time,
} from "tone/build/esm/core/type/Units";
import {
  ToneBufferSource,
  ToneBufferSourceCurve,
} from "tone/build/esm/source/buffer/ToneBufferSource.js";
import { FrequencyClass } from "tone/build/esm/core/type/Frequency.js";
import {
  ftomf,
  intervalToFrequencyRatio,
} from "tone/build/esm/core/type/Conversions.js";

import * as Tone from "tone";

export class CustomSampler extends Tone.Sampler {
  customOffset = 0; // in seconds

  triggerAttack = (
    notes: Frequency | Frequency[],
    time?: Time,
    velocity: NormalRange = 1
  ): this => {
    this.log("triggerAttack", notes, time, velocity);
    if (!Array.isArray(notes)) {
      notes = [notes];
    }
    notes.forEach((note) => {
      const midiFloat = ftomf(
        new FrequencyClass(this.context, note).toFrequency()
      );
      const midi = Math.round(midiFloat) as MidiNote;
      const remainder = midiFloat - midi;
      // find the closest note pitch
      const difference = this._findClosest(midi);
      const closestNote = midi - difference;
      const buffer = this._buffers.get(closestNote);
      const playbackRate = intervalToFrequencyRatio(difference + remainder);
      // play that note
      const source = new ToneBufferSource({
        url: buffer,
        context: this.context,
        curve: this.curve,
        fadeIn: this.attack,
        fadeOut: this.release,
        playbackRate,
      }).connect(this.output);
      source.start(time, 0, buffer.duration / playbackRate, velocity);
      // add it to the active sources
      if (!isArray(this._activeSources.get(midi))) {
        this._activeSources.set(midi, []);
      }
      (this._activeSources.get(midi) as ToneBufferSource[]).push(source);

      // remove it when it's done
      source.onended = () => {
        if (this._activeSources && this._activeSources.has(midi)) {
          const sources = this._activeSources.get(midi) as ToneBufferSource[];
          const index = sources.indexOf(source);
          if (index !== -1) {
            sources.splice(index, 1);
          }
        }
      };
    });
    return this;
  };
}
