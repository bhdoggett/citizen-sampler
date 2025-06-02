// const initKitSampleData = (
//     id: string,
//     url: string,
//     title: string,
//     collection: string
//   ): SampleType => {
//     return {
//       id: id,
//       title: title,
//       type: "kit",
//       collectionName: collection,
//       url: url,
//       events: { A: [], B: [], C: [], D: [] },
//       settings: {
//         mute: false,
//         solo: false,
//         reverse: false,
//         start: 0,
//         end: null,
//         volume: 0,
//         pan: 0,
//         baseNote: "C4",
//         pitch: 0,
//         attack: 0,
//         release: 0,
//         quantize: false,
//         quantVal: 4,
//         highpass: [0, "highpass"] as [number, "highpass"],
//         lowpass: [20000, "lowpass"] as [number, "lowpass"],
//       },
//       attribution: "",
//     };
//   };

//   const initKitSamples = (machineId: DrumMachineId) => {
//     const formatSampleHeaders = (
//       machineId: DrumMachineId,
//       type: string
//     ): { title: string; url: string; collection: string } => {
//       const url = drumMachines[machineId].samples.find((sample: string) =>
//         sample.includes(`${type}`)
//       );
//       const fullUrl = KITS_BASE_URL + url;
//       const collection = drumMachines[machineId].name;
//       const title = url!.split(".")[0].split("__")[1].replace("_", " ");

//       return { title, url: fullUrl, collection };
//     };

//     const samples = [
//       formatSampleHeaders(machineId, "kick"),
//       formatSampleHeaders(machineId, "snare"),
//       formatSampleHeaders(machineId, "hat"),
//       formatSampleHeaders(machineId, "rim"),
//     ];

//     return samples.reduce(
//       (acc, sample, index) => {
//         const id = `pad-${index + 13}`;
//         acc[id] = initKitSampleData(
//           id,
//           sample.url,
//           sample.title,
//           sample.collection
//         );
//         return acc;
//       },
//       {} as Record<string, SampleType>
//     );
//   };
