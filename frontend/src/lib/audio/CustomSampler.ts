import { ToneAudioBuffer } from "tone/build/esm/core/context/ToneAudioBuffer.js";
import { ToneAudioBuffers } from "tone/build/esm/core/context/ToneAudioBuffers.js";
import {
  ftomf,
  intervalToFrequencyRatio,
} from "tone/build/esm/core/type/Conversions.js";
import { FrequencyClass } from "tone/build/esm/core/type/Frequency.js";
import type {
  Frequency,
  Interval,
  MidiNote,
  NormalRange,
  Note,
  Time,
} from "tone/build/esm/core/type/Units.js";
import { optionsFromArguments } from "tone/build/esm/core/util/Defaults.js";
import { noOp } from "tone/build/esm/core/util/Interface.js";
import {
  isArray,
  isNote,
  isNumber,
} from "tone/build/esm/core/util/TypeCheck.js";
import {
  Instrument,
  InstrumentOptions,
} from "tone/build/esm/instrument/Instrument.js";
import {
  ToneBufferSource,
  ToneBufferSourceCurve,
} from "tone/build/esm/source/buffer/ToneBufferSource.js";
import { timeRange } from "tone/build/esm/core/util/Decorator.js";
import { assert } from "tone/build/esm/core/util/Debug.js";

interface SamplesMap {
  [note: string]: ToneAudioBuffer | AudioBuffer | string;
  [midi: number]: ToneAudioBuffer | AudioBuffer | string;
}

export interface CustomSamplerOptions extends InstrumentOptions {
  attack: Time;
  release: Time;
  onload: () => void;
  onerror: (error: Error) => void;
  baseUrl: string;
  curve: ToneBufferSourceCurve;
  urls: SamplesMap;
}

/**
 * Pass in an object which maps the note's pitch or midi value to the url,
 * then you can trigger the attack and release of that note like other instruments.
 * By automatically repitching the samples, it is possible to play pitches which
 * were not explicitly included which can save loading time.
 *
 * For sample or buffer playback where repitching is not necessary,
 * use {@link Player}.
 * @example
 * const sampler = new CustomSampler({
 * 	urls: {
 * 		A1: "A1.mp3",
 * 		A2: "A2.mp3",
 * 	},
 * 	baseUrl: "https://tonejs.github.io/audio/casio/",
 * 	onload: () => {
 * 		sampler.triggerAttackRelease(["C1", "E1", "G1", "B1"], 0.5);
 * 	}
 * }).toDestination();
 * @category Instrument
 */

export class CustomSampler extends Instrument<CustomSamplerOptions> {
  readonly name: string = "CustomSampler";

  /**
   * The stored and loaded buffers
   */
  private _buffers: ToneAudioBuffers;

  /**
   * The object of all currently playing BufferSources
   */
  private _activeSources: Map<MidiNote, ToneBufferSource[]> = new Map();

  /**
   * The envelope applied to the beginning of the sample.
   * @min 0
   * @max 1
   */
  @timeRange(0)
  attack: Time;

  /**
   * The envelope applied to the end of the envelope.
   * @min 0
   * @max 1
   */
  @timeRange(0)
  release: Time;

  /**
   * The shape of the attack/release curve.
   * Either "linear" or "exponential"
   */
  curve: ToneBufferSourceCurve;

  /**
   * @param samples An object of samples mapping either Midi Note Numbers or
   * 			Scientific Pitch Notation to the url of that sample.
   * @param onload The callback to invoke when all of the samples are loaded.
   * @param baseUrl The root URL of all of the samples, which is prepended to all the URLs.
   */
  constructor(samples?: SamplesMap, onload?: () => void, baseUrl?: string);
  /**
   * @param samples An object of samples mapping either Midi Note Numbers or
   * 			Scientific Pitch Notation to the url of that sample.
   * @param options The remaining options associated with the sampler
   */
  constructor(
    samples?: SamplesMap,
    options?: Partial<Omit<CustomSamplerOptions, "urls">>
  );
  constructor(options?: Partial<CustomSamplerOptions>);
  constructor() {
    const options = optionsFromArguments(
      CustomSampler.getDefaults(),
      // eslint-disable-next-line prefer-rest-params
      arguments,
      ["urls", "onload", "baseUrl"],
      "urls"
    );
    super(options);

    const urlMap: { [midi: number]: string | ToneAudioBuffer | AudioBuffer } =
      {};
    Object.keys(options.urls).forEach((note) => {
      const noteNumber = parseInt(note, 10);
      assert(
        isNote(note) || (isNumber(noteNumber) && isFinite(noteNumber)),
        `url key is neither a note or midi pitch: ${note}`
      );
      if (isNote(note)) {
        // convert the note name to MIDI
        const mid = new FrequencyClass(this.context, note).toMidi();
        urlMap[mid] = options.urls[note];
      } else if (isNumber(noteNumber) && isFinite(noteNumber)) {
        // otherwise if it's numbers assume it's midi
        urlMap[noteNumber] = options.urls[noteNumber];
      }
    });

    this._buffers = new ToneAudioBuffers({
      urls: urlMap,
      onload: options.onload,
      baseUrl: options.baseUrl,
      onerror: options.onerror,
    });
    this.attack = options.attack;
    this.release = options.release;
    this.curve = options.curve;

    // invoke the callback if it's already loaded
    if (this._buffers.loaded) {
      // invoke onload deferred
      Promise.resolve().then(options.onload);
    }
  }

  static getDefaults(): CustomSamplerOptions {
    return Object.assign(Instrument.getDefaults(), {
      attack: 0,
      baseUrl: "",
      curve: "exponential" as const,
      onload: noOp,
      onerror: noOp,
      release: 0.1,
      urls: {},
    });
  }

  /**
   * Returns the difference in steps between the given midi note at the closets sample.
   */
  private _findClosest(midi: MidiNote): Interval {
    // searches within 8 octaves of the given midi note
    const MAX_INTERVAL = 96;
    let interval = 0;
    while (interval < MAX_INTERVAL) {
      // check above and below
      if (this._buffers.has(midi + interval)) {
        return -interval;
      } else if (this._buffers.has(midi - interval)) {
        return interval;
      }
      interval++;
    }
    throw new Error(`No available buffers for note: ${midi}`);
  }

  /**
   * @param  notes	The note to play, or an array of notes.
   * @param  time     When to play the note
   * @param  offset   The offset into the sample to start playback.
   * @param  velocity The velocity to play the sample back.
   * @param  playbackRateOverride The playback rate to override the sample's default.
   *                            If not provided, the sample will be played back at its default rate.
   */
  override triggerAttack(
    notes: Frequency | Frequency[],
    time?: Time,
    offset?: Time,
    velocity?: NormalRange,
    playbackRateOverride?: number
  ): this {
    this.log("triggerAttack", notes, time, offset, velocity);
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
      const playbackRate =
        playbackRateOverride ??
        intervalToFrequencyRatio(difference + remainder);
      // play that note
      const source = new ToneBufferSource({
        url: buffer,
        context: this.context,
        curve: this.curve,
        fadeIn: this.attack,
        fadeOut: this.release,
        playbackRate,
      }).connect(this.output);
      source.start(time, offset, buffer.duration / playbackRate, velocity);
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
  }

  /**
   * @param  notes	The note to release, or an array of notes.
   * @param  time     	When to release the note.
   */
  triggerRelease(notes: Frequency | Frequency[], time?: Time): this {
    this.log("triggerRelease", notes, time);
    if (!Array.isArray(notes)) {
      notes = [notes];
    }
    notes.forEach((note) => {
      const midi = new FrequencyClass(this.context, note).toMidi();
      // find the note
      if (
        this._activeSources.has(midi) &&
        (this._activeSources.get(midi) as ToneBufferSource[]).length
      ) {
        const sources = this._activeSources.get(midi) as ToneBufferSource[];
        time = this.toSeconds(time);
        sources.forEach((source) => {
          source.stop(time);
        });
        this._activeSources.set(midi, []);
      }
    });
    return this;
  }

  /**
   * Release all currently active notes.
   * @param  time     	When to release the notes.
   */
  releaseAll(time?: Time): this {
    const computedTime = this.toSeconds(time);
    this._activeSources.forEach((sources) => {
      while (sources.length) {
        const source = sources.shift() as ToneBufferSource;
        source.stop(computedTime);
      }
    });
    return this;
  }

  sync(): this {
    if (this._syncState()) {
      this._syncMethod("triggerAttack", 1);
      this._syncMethod("triggerRelease", 1);
    }
    return this;
  }

  /**
   * Invoke the attack phase, then after the duration, invoke the release.
   * @param  notes	The note to play and release, or an array of notes.
   * @param  duration The time the note should be held
   * @param  time     When to start the attack
   * @param  velocity The velocity of the attack
   */
  triggerAttackRelease(
    notes: Frequency[] | Frequency,
    duration: Time | Time[],
    time?: Time,
    offset?: Time,
    velocity: NormalRange = 1,
    playbackRateOverride?: number
  ): this {
    const computedTime = this.toSeconds(time);
    this.triggerAttack(
      notes,
      computedTime,
      offset,
      velocity,
      playbackRateOverride
    );
    if (isArray(duration)) {
      assert(isArray(notes), "notes must be an array when duration is array");
      (notes as Frequency[]).forEach((note, index) => {
        const d = duration[Math.min(index, duration.length - 1)];
        this.triggerRelease(note, computedTime + this.toSeconds(d));
      });
    } else {
      this.triggerRelease(notes, computedTime + this.toSeconds(duration));
    }
    return this;
  }

  /**
   * Add a note to the sampler.
   * @param  note      The buffer's pitch.
   * @param  url  Either the url of the buffer, or a buffer which will be added with the given name.
   * @param  callback  The callback to invoke when the url is loaded.
   */
  add(
    note: Note | MidiNote,
    url: string | ToneAudioBuffer | AudioBuffer,
    callback?: () => void
  ): this {
    assert(
      isNote(note) || isFinite(note),
      `note must be a pitch or midi: ${note}`
    );
    if (isNote(note)) {
      // convert the note name to MIDI
      const mid = new FrequencyClass(this.context, note).toMidi();
      this._buffers.add(mid, url, callback);
    } else {
      // otherwise if it's numbers assume it's midi
      this._buffers.add(note, url, callback);
    }
    return this;
  }

  /**
   * If the buffers are loaded or not
   */
  get loaded(): boolean {
    return this._buffers.loaded;
  }

  /**
   * Clean up
   */
  dispose(): this {
    super.dispose();
    this._buffers.dispose();
    this._activeSources.forEach((sources) => {
      sources.forEach((source) => source.dispose());
    });
    this._activeSources.clear();
    return this;
  }
}
