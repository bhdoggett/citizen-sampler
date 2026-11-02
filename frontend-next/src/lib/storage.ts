// Every localStorage key the app uses. Each key has one owner:
// - AudioContext: songId, songTitle, samples, loops
// - AuthContext: token, userId, username, displayName
// - page.tsx: citizenSamplerHasSeenWelcome
export type StorageKey =
  | "songId"
  | "songTitle"
  | "samples"
  | "loops"
  | "token"
  | "userId"
  | "username"
  | "displayName"
  | "citizenSamplerHasSeenWelcome";

const hasStorage = () => typeof window !== "undefined";

export function readString(key: StorageKey): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(key);
}

// An empty or null value removes the key
export function writeString(key: StorageKey, value: string | null): void {
  if (!hasStorage()) return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

export function readJSON<T>(key: StorageKey): T | null {
  const raw = readString(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(key: StorageKey, value: unknown): void {
  writeString(key, JSON.stringify(value));
}
