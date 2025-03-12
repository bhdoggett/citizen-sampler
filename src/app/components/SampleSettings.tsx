// "use client";
// import { useAudioContext } from "../contexts/AudioContext";
// import { useState, useEffect } from "react";

// const SampleSettings = ({ sampleId }) => {
//   const { allSampleData, setAllSampleData, updateSamplerSettings } =
//     useAudioContext();
//   const sample = allSampleData.find((s) => s.id === sampleId);
//   const [settings, setSettings] = useState(sample ? sample.settings : {});

//   if (!sample) {
//     return <p>Sample not found.</p>;
//   }

//   // Keep sampler settings in sync with UI
//   useEffect(() => {
//     if (sample && settings) {
//       updateSamplerSettings(sampleId, settings);
//     }
//   }, [settings, sampleId, updateSamplerSettings]);

//   const updateSetting = (section, key, value) => {
//     setSettings((prev) => {
//       const newSettings = {
//         ...prev,
//         [section]: {
//           ...prev[section],
//           [key]: value,
//         },
//       };
//       return newSettings;
//     });
//   };

//   const saveSettings = () => {
//     setAllSampleData((prevSamples) =>
//       prevSamples.map((s) => (s.id === sampleId ? { ...s, settings } : s))
//     );
//   };

//   return (
//     <div className="p-4">
//       <h3 className="text-lg font-semibold mb-4">
//         Editing Settings for {sample.title}
//       </h3>

//       <div className="space-y-4">
//         <div className="flex flex-col">
//           <label className="mb-2">
//             Gain:
//             <input
//               type="range"
//               min="0"
//               max="2"
//               step="0.1"
//               value={settings.gain || 1}
//               onChange={(e) =>
//                 updateSetting("gain", parseFloat(e.target.value))
//               }
//               className="w-full"
//             />
//           </label>

//           <label className="mb-2">
//             Attack:
//             <input
//               type="range"
//               min="0"
//               max="1"
//               step="0.01"
//               value={settings.attack || 0}
//               onChange={(e) =>
//                 updateSetting("attack", parseFloat(e.target.value))
//               }
//               className="w-full"
//             />
//           </label>

//           <label className="mb-2">
//             Release:
//             <input
//               type="range"
//               min="0"
//               max="1"
//               step="0.01"
//               value={settings.release || 0}
//               onChange={(e) =>
//                 updateSetting("release", parseFloat(e.target.value))
//               }
//               className="w-full"
//             />
//           </label>

//           <label className="mb-2">
//             Highpass:
//             <input
//               type="range"
//               min="0"
//               max="20000"
//               step="1"
//               value={settings.fx?.highpass[0] || 0}
//               onChange={(e) =>
//                 updateSetting("fx", "highpass", [
//                   parseFloat(e.target.value),
//                   "highpass",
//                 ])
//               }
//               className="w-full"
//             />
//           </label>

//           <label className="mb-2">
//             Lowpass:
//             <input
//               type="range"
//               min="0"
//               max="20000"
//               step="1"
//               value={settings.fx?.lowpass[0] || 20000}
//               onChange={(e) =>
//                 updateSetting("fx", "lowpass", [
//                   parseFloat(e.target.value),
//                   "lowpass",
//                 ])
//               }
//               className="w-full"
//             />
//           </label>
//         </div>

//         <button
//           onClick={saveSettings}
//           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//         >
//           Save
//         </button>
//       </div>
//     </div>
//   );
// };

// export default SampleSettings;
