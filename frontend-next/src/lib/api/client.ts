import axios from "axios";
import type { AllLoopSettingsFE, SampleTypeFE, SongTypeFE } from "src/types/audioTypesFE";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const api = axios.create({ baseURL: API_BASE_URL });

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export type SongPayload = {
  song: {
    title: string;
    loops: AllLoopSettingsFE;
    samples: Record<string, SampleTypeFE>;
  };
  userId: string | null;
};

type MessageResponse = { message: string };

const auth = (token: string | null) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// The server's own message when it sent one, otherwise the fallback
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)
      ?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

// True only when the API rejected the token. An outage (a network failure,
// a 5xx, or a proxy error page) says nothing about the session.
export function isAuthRejection(err: unknown): boolean {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  return status === 401 || status === 403;
}

export async function createSong(token: string | null, song: SongPayload) {
  const res = await api.post<MessageResponse & { song: SongTypeFE }>(
    "/beats/me/songs",
    song,
    auth(token)
  );
  return res.data;
}

export async function updateSong(
  token: string | null,
  songId: string,
  song: SongPayload
) {
  const res = await api.put<MessageResponse>(
    `/beats/me/songs/${songId}`,
    song,
    auth(token)
  );
  return res.data;
}

export async function deleteSong(token: string | null, songId: string) {
  const res = await api.delete<MessageResponse>(
    `/beats/me/songs/${songId}`,
    auth(token)
  );
  return res.data;
}

// The server answers with a list of titles, or a message when there are none
export async function listSongTitles(token: string | null) {
  const res = await api.get<string[] | MessageResponse>(
    "/beats/me/songs",
    auth(token)
  );
  return res.data;
}

// Songs load by title, which can hold any character, so encode it
export async function getSong(token: string | null, title: string) {
  const res = await api.get<MessageResponse & { song: SongTypeFE }>(
    `/beats/me/songs/${encodeURIComponent(title)}`,
    auth(token)
  );
  return res.data;
}

export async function checkLogin(token: string | null) {
  const res = await api.get<{ loggedIn: boolean; message?: string }>(
    "/auth/check-login",
    auth(token)
  );
  return res.data;
}
