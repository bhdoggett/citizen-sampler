import {
  inventingEntertainment,
  VD_inventingEntertainment,
  varietyStageSoundRecordingsAndMotionPictures,
  VD_varietyStageSoundRecordingsAndMotionPictures,
  theJoeSmithCollection,
  VD_theJoeSmithCollection,
  freeMusicArchive,
  VD_freeMusicArchive,
  musicBoxProject,
  VD_musicBoxProject,
  tonySchwartzCollection,
  VD_tonySchwartzCollection,
  americanEnglishDialectRecordings,
  VD_americanEnglishDialectRecordings,
  theNationalScreeningRoom,
  VD_theNationalScreeningRoom,
  njbBlues,
  VD_njbBlues,
  njbJazz,
  VD_njbJazz,
  njbFolkMusic,
  VD_njbFolkMusic,
  njbOpera,
  VD_njbOpera,
  njbMusicalTheater,
  VD_njbMusicalTheater,
  njbClassicalMusic,
  VD_njbClassicalMusic,
  njbPopularMusic,
  VD_njbPopularMusic,
} from "./sampleSources";

export const collectionNames = [
  "Inventing Entertainment",
  "Variety State Sound Recordngs and Motion Pictures",
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

export const getCollectionArray = (collection: string) => {
  switch (collection) {
    case "Inventing Entertainment":
      return inventingEntertainment;
    case "Variety State Sound Recordngs and Motion Pictures":
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
