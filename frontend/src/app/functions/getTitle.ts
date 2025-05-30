// Extract title from href url, e.g. "https://s3.amazonaws.com/citizen-dj-assets.labs.loc.gov/audio/samplepacks/loc-jukebox-blues/Joe-Turner-blues-medley_jukebox-19795_001_00-00-00.wav"

export const getTitle = (url: string) => {
  const filename = url.split("/").pop();
  console.log("filename", filename);
  if (!filename) return "";
  const rawTitle = filename.split("_")[0]; // "Joe-Turner-blues-medley"
  const number = filename.split("_")[2]; // 001
  const title = rawTitle.replace(/-/g, " "); // "Joe Turner blues medley"
  const upperCaseTitle = title.replace(/\b\w/g, (c) => c.toUpperCase());
  const joinedTitle = `${upperCaseTitle} ${number}`; // "Joe Turner Blues Medley 001"
  return joinedTitle;
};

export const getLabel = (url: string) =>
  url.split("/").pop()?.split("_").slice(0, 3).join("_");
