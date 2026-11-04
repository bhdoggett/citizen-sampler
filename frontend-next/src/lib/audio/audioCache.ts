import { get, set } from "idb-keyval";

// Sample audio is cached in IndexedDB per pad, keyed with the url it came
// from so a pad that changes sample doesn't play the old one.

export async function storeAudioInIndexedDB(url: string, sampleId: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }
    const blob = await response.blob();
    await set(`audio-${sampleId}`, { url, blob });
  } catch (error) {
    console.error("Failed to store audio in IndexedDB:", error);
  }
}

// An object url for the cached audio, or null when nothing is cached for
// this url
export async function getCachedAudioUrlFromIndexedDB(
  sampleId: string,
  currentUrl: string,
): Promise<string | null> {
  const cached = await get<{ url: string; blob: Blob }>(`audio-${sampleId}`);
  if (!cached || cached.url !== currentUrl) return null;
  return URL.createObjectURL(cached.blob);
}
