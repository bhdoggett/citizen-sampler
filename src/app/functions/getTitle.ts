// Extract title from href url, e.g. "https://s3.amazonaws.com/citizen-dj-assets.labs.loc.gov/audio/samplepacks/loc-jukebox-blues/Joe-Turner-blues-medley_jukebox-19795_001_00-00-00.wav"

export const getTitle = (url: string) => {
  const filename = url.split("/").pop();
  if (!filename) return "";
  const rawTitle = filename.split("_")[0]; // "Joe-Turner-blues-medley"
  const title = rawTitle.replace(/-/g, " "); // "Joe Turner blues medley"
  return title.replace(/\b\w/g, (c) => c.toUpperCase()); // "Joe Turner Blues Medley"
};

export const getLabel = (url: string) =>
  url.split("/").pop()?.split("_").slice(0, 3);
