This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

/////
Tone.js
WaveSurfer.js
Express
Vercel
Render
HeroIcons

Citizen Sampler is an MPC-style instrument inspired by and made possible by the Citizen DJ project at the Librry of Congress.

As a musician, when I came across the Citizen DJ project, I was immediately excited by the expansive catalog of public-domain audio samples from American History, and inspired by ways these samples could be combined in creative ways in new musical projects. But where Citizen DJ provides a sequencer to program audio playback by beat subdivision, I wanted to build something that could be played like an instrument and programmed in real time.

In order to manage audio playback, I originally started by interacting with the web audio API directly. But I quickly discovered Tone.js as a powerful library, built on top of the Web Audio API, with a wealth of resources for making this more intuitive and efficient. All drum pads on Citizen Sampler are linked to a customer forked from Tone's sampler instrument to allow for offsetting the starting location of the sample's audio buffer, and Tone.js is is used to add filters and FX, as well as schedule audio playback for recorded.
