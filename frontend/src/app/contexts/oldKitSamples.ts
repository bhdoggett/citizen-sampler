/////////////////////////////////////////
// const initKitSampleData = (
//   id: string,
//   url: string,
//   title: string,
//   label: string,
//   collection: string
// ): SampleType => {
//   return {
//     id: id,
//     title: title,
//     type: "kit",
//     collectionName: collection,
//     url: url,
//     events: { A: [], B: [], C: [], D: [] },
//     settings: {
//       mute: false,
//       solo: false,
//       reverse: false,
//       timeStretch: false,
//       oneShot: false,
//       loop: false,
//       start: 0,
//       end: null,
//       volume: 0,
//       pan: 0,
//       baseNote: "C4",
//       pitch: 0,
//       attack: 0,
//       release: 0,
//       quantize: false,
//       quantVal: 4,
//       highpass: [0, "highpass"] as [number, "highpass"],
//       lowpass: [20000, "lowpass"] as [number, "lowpass"],
//       ui: { zoom: 0, seekTo: 0 },
//     },
//     attribution: "",
//   };
// };

// const initKitSamples = () => {
//   const samples = [
//     {
//       title: "Kick_Bulldog_2",
//       url: "/samples/drums/kicks/Kick_Bulldog_2.wav",
//       collection: "Kit",
//     },
//     {
//       title: "Snare_Astral_1",
//       url: "/samples/drums/snares/Snare_Astral_1.wav",
//       collection: "Kit",
//     },
//     {
//       title: "ClosedHH_Alessya_DS",
//       url: "/samples/drums/hats/ClosedHH_Alessya_DS.wav",
//       collection: "Kit",
//     },
//     {
//       title: "Clap_Graphite",
//       url: "/samples/drums/claps/Clap_Graphite.wav",
//       collection: "Kit",
//     },
//   ];

//   return samples.reduce(
//     (acc, sample, index) => {
//       const id = `pad-${index + 13}`;
//       const label = sample.title.split("_").slice(0)[0];
//       acc[id] = initKitSampleData(
//         id,
//         sample.url,
//         sample.title,
//         label,
//         sample.collection
//       );
//       return acc;
//     },
//     {} as Record<string, SampleType>
//   );
// };
