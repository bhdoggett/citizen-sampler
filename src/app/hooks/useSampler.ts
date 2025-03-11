import { url } from "inspector";
import * as Tone from "tone";
import type { SampleData } from "../types/SampleData";

const useSampler = (sample: SampleData) => {
  const sampler = new Tone.Sampler({
    urls: { C4: sample.url },
    attack: 0,
    release: 0,
  });

  const highpass = new Tone.Filter(0, "highpass");
  const lowpass = new Tone.Filter(20000, "lowpass");
  const eq = new Tone.EQ3();
  const reverb = new Tone.JCReverb(0.2);
  const delay = new Tone.FeedbackDelay(3, 0.1);
  sampler.chain(highpass, lowpass, eq, delay, reverb).toDestination();

  return { sampler, highpass, lowpass, eq, reverb, delay };
};

export default useSampler;
