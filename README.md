Citizen Sampler is an MPC-style instrument web app inspired by and made possible by the Citizen DJ project at the Librry of Congress.

As a musician, when I came across the Citizen DJ project, I was immediately excited by the expansive catalog of public-domain audio samples from American History, and inspired by ways these samples could be combined in creative ways in new musical projects. But where Citizen DJ provides a sequencer to program audio playback by beat subdivision, I wanted to build something that could be played like an instrument and programmed in real time.

In order to manage audio playback, I originally started by interacting with the web audio API directly, but I quickly discovered Tone.js as a powerful library, built on top of the Web Audio API, with a wealth of resources for making this more intuitive and efficient. All playable pads on the page are linked to a "custom sampler" forked from Tone's sampler instrument to allow for an offset of the starting location of the sample's playback. Tone is also used to add filters and FX, as well as to mangage loop settings and schedule playback for recorded sample play events.

The samples themselves are in two categories. First of all, samples curated by the Citizen DJ project are in the public domain and are accessed via the Library of Congress. All kit samples were generated from drumkits provided by Slackermedia Multimedia Sprint v2 and have been made available under a Creative Commons Attribution-ShareAlike 3.0 license (https://creativecommons.org/licenses/by-sa/3.0/us/). The audio files that the Citizen DJ project derived from the drumkits can be downloaded from Github (https://github.com/LibraryOfCongress/citizen-dj/tree/master/audio/drum_machines) and are have been made available under a Attribution-ShareAlike 4.0 International license (https://creativecommons.org/licenses/by-sa/4.0/).

The Backend is built with Node.js and express. MongoDB is used for data storage, with Mongoose to query the database. Anyone who visits the site will be able to build a beat and download wav stems, but to save a song reliably and to create more than one song a user will need to make an account.

## Getting Started

```bash
git clone https://github.com/bhdoggett/citizen-sampler.git
cd citizen-sampler
```

Backend

```bash
cd backend
npm install
npm run dev
```

Frontend

```bash
cd frontend
npm install
npm run dev
```
