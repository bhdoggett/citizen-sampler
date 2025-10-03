import {
  inventingEntertainment,
  // VD_inventingEntertainment,
  varietyStageSoundRecordingsAndMotionPictures,
  // VD_varietyStageSoundRecordingsAndMotionPictures,
  theJoeSmithCollection,
  // VD_theJoeSmithCollection,
  freeMusicArchive,
  // VD_freeMusicArchive,
  musicBoxProject,
  // VD_musicBoxProject,
  tonySchwartzCollection,
  // VD_tonySchwartzCollection,
  americanEnglishDialectRecordings,
  // VD_americanEnglishDialectRecordings,
  theNationalScreeningRoom,
  // VD_theNationalScreeningRoom,
  njbBlues,
  // VD_njbBlues,
  njbJazz,
  // VD_njbJazz,
  njbFolkMusic,
  // VD_njbFolkMusic,
  njbOpera,
  // VD_njbOpera,
  njbMusicalTheater,
  // VD_njbMusicalTheater,
  njbClassicalMusic,
  // VD_njbClassicalMusic,
  njbPopularMusic,
  // VD_njbPopularMusic,
} from "./loc_sample_sources";

export const collectionNames = [
  "All",
  "Inventing Entertainment",
  "Variety State Sound Recordings and Motion Pictures",
  "The Joe Smith Collection",
  "Free Music Archive",
  "MusicBox Project",
  "Tony Schwatz Collection",
  "American English Dialect Recordings",
  "The National Screening Room",
  "The National Jukebox: Blues",
  "The National Jukebox: Jazz",
  "The National Jukebox: Folk Music",
  "The National Jukebox: Opera",
  "The National Jukebox: Musical Theater",
  "The National Jukebox: Classical Music",
  "The National Jukebox: Popular Music",
];

export const getCollectionArrayFromName = (collection: string) => {
  switch (collection) {
    case "Inventing Entertainment":
      return inventingEntertainment;
    case "Variety State Sound Recordings and Motion Pictures":
      return varietyStageSoundRecordingsAndMotionPictures;
    case "The Joe Smith Collection":
      return theJoeSmithCollection;
    case "Free Music Archive":
      return freeMusicArchive;
    case "MusicBox Project":
      return musicBoxProject;
    case "Tony Schwatz Collection":
      return tonySchwartzCollection;
    case "American English Dialect Recordings":
      return americanEnglishDialectRecordings;
    case "The National Screening Room":
      return theNationalScreeningRoom;
    case "The National Jukebox: Blues":
      return njbBlues;
    case "The National Jukebox: Jazz":
      return njbJazz;
    case "The National Jukebox: Folk Music":
      return njbFolkMusic;
    case "The National Jukebox: Opera":
      return njbOpera;
    case "The National Jukebox: Musical Theater":
      return njbMusicalTheater;
    case "The National Jukebox: Classical Music":
      return njbClassicalMusic;
    case "The National Jukebox: Popular Music":
      return njbPopularMusic;
    default:
      return inventingEntertainment;
  }
};

export const getCollectionNameFromArray = (array: string[]): string => {
  if (array === inventingEntertainment) return "Inventing Entertainment";
  if (array === varietyStageSoundRecordingsAndMotionPictures)
    return "Variety State Sound Recordings and Motion Pictures";
  if (array === theJoeSmithCollection) return "The Joe Smith Collection";
  if (array === freeMusicArchive) return "Free Music Archive";
  if (array === musicBoxProject) return "MusicBox Project";
  if (array === tonySchwartzCollection) return "Tony Schwatz Collection";
  if (array === americanEnglishDialectRecordings)
    return "American English Dialect Recordings";
  if (array === theNationalScreeningRoom) return "The National Screening Room";
  if (array === njbBlues) return "The National Jukebox: Blues";
  if (array === njbJazz) return "The National Jukebox: Jazz";
  if (array === njbFolkMusic) return "The National Jukebox: Folk Music";
  if (array === njbOpera) return "The National Jukebox: Opera";
  if (array === njbMusicalTheater)
    return "The National Jukebox: Musical Theater";
  if (array === njbClassicalMusic)
    return "The National Jukebox: Classical Music";
  if (array === njbPopularMusic) return "The National Jukebox: Popular Music";
  return "Unknown Collection";
};

// Get allUrls in one combined array.
export type UrlEntry = {
  url: string;
  collection: string;
};

export const getAllUrls = (): UrlEntry[] => {
  const sources = [
    inventingEntertainment,
    varietyStageSoundRecordingsAndMotionPictures,
    theJoeSmithCollection,
    freeMusicArchive,
    musicBoxProject,
    tonySchwartzCollection,
    americanEnglishDialectRecordings,
    theNationalScreeningRoom,
    njbBlues,
    njbJazz,
    njbFolkMusic,
    njbOpera,
    njbMusicalTheater,
    njbClassicalMusic,
    njbPopularMusic,
  ];

  const allUrls: UrlEntry[] = [];

  sources.forEach((sourceArray) => {
    sourceArray.forEach((url) => {
      allUrls.push({
        url,
        collection: getCollectionNameFromArray(sourceArray),
      });
    });
  });

  return allUrls;
};
