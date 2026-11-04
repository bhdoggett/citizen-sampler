import type { SampleTypeFE } from "src/types/audioTypesFE";
import { emptyLoopEvents } from "src/lib/constants/loops";
import { KIT_PAD_IDS, LOC_PAD_COUNT, padId } from "src/lib/constants/padLayout";
import { defaultSampleSettings } from "src/lib/audio/defaults";
import { getCollectionArrayFromName, type UrlEntry } from "src/lib/loc_collections";
import { allUrlsWithCollectionNames } from "src/lib/loc_sample_sources";
import { getTitle } from "src/lib/getTitle";
import {
  drumMachines,
  type DrumMachineId,
  getKitSampleTitle,
  drumUrl,
} from "src/lib/drumMachines";

// Fresh pad data for new songs, collection and kit loads

// Select random urls, one per loc pad, from the allLOCUrls array
const selectRandomUrlEntries = (
  array: UrlEntry[] | string[],
  collection?: string
): UrlEntry[] | string[] => {
  // Fisher-Yates algorithm to shuffle the array into random order
  let workingArray: UrlEntry[] | string[];

  // If it's a string array and collection is defined, override with collection array
  if (typeof array[0] === "string" && collection) {
    workingArray = getCollectionArrayFromName(collection);
  } else {
    workingArray = [...array] as UrlEntry[];
  }

  // Shuffle and return k elements
  const n = workingArray.length;
  const k = Math.min(LOC_PAD_COUNT, n);

  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [workingArray[i], workingArray[j]] = [workingArray[j], workingArray[i]];
  }

  return workingArray.slice(0, k);
};

// Format state data for a given loc sampler
export const initLocSampleData = (
  id: string,
  url: string,
  collection: string
): SampleTypeFE => {
  return {
    id: id,
    title: getTitle(url),
    type: "loc",
    collectionName: collection,
    url: url,
    events: emptyLoopEvents(),
    settings: defaultSampleSettings(),
    attribution: "",
  };
};

// Initialize loc samples data from all collections
export const initLocSamplesFromAllCollections = () => {
  const selectedSamples = selectRandomUrlEntries(
    allUrlsWithCollectionNames
  ) as UrlEntry[];

  const locSampleData = selectedSamples.reduce(
    (acc, sample, i) => {
      const key = padId(i + 1);
      acc[key] = initLocSampleData(key, sample.url, sample.collection);
      return acc;
    },
    {} as Record<string, SampleTypeFE>
  );

  return locSampleData;
};

// Initialize loc samples data from one collection
export const initLocSamplesFromOneCollection = (collection: string) => {
  const selectedSamples = selectRandomUrlEntries(
    getCollectionArrayFromName(collection)
  ) as string[];

  const locSampleData = selectedSamples.reduce(
    (acc, url, i) => {
      const key = padId(i + 1);
      acc[key] = initLocSampleData(key, url, collection);
      return acc;
    },
    {} as Record<string, SampleTypeFE>
  );

  return locSampleData;
};

// Format state data for a given kit sample
export const initKitSampleData = (
  id: string,
  url: string,
  title: string,
  drumMachine: string
): SampleTypeFE => {
  return {
    id: id,
    title: title,
    type: "kit",
    collectionName: drumMachine,
    url: url,
    events: emptyLoopEvents(),
    settings: defaultSampleSettings(),
  };
};

// Initialize kit samples data for a given drum machine
export const initKitSamples = (
  machineId: DrumMachineId
): Record<string, SampleTypeFE> => {
  const formatSampleHeaders = (
    machineId: DrumMachineId,
    type: string
  ): { title: string; url: string; collection: string } => {
    const fileName = drumMachines[machineId].samples.find((sample: string) =>
      sample.includes(`${type}`)
    );
    if (!fileName) {
      throw new Error(`No ${type} sample found for machine ${machineId}`);
    }
    const url = drumUrl(fileName);
    const collection = drumMachines[machineId].name;
    const title = getKitSampleTitle(fileName);

    return { title, url, collection };
  };

  const samples = [
    formatSampleHeaders(machineId, "kick"),
    formatSampleHeaders(machineId, "snare"),
    formatSampleHeaders(machineId, "hat"),
    formatSampleHeaders(machineId, "rim"),
  ];

  return samples.reduce(
    (acc, sample, index) => {
      const id = KIT_PAD_IDS[index];
      acc[id] = initKitSampleData(
        id,
        sample.url,
        sample.title,
        sample.collection
      );
      return acc;
    },
    {} as Record<string, SampleTypeFE>
  );
};
