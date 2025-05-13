import type { Song } from "./audioTypes";

export type User = {
  id: string;
  email: string;
  name: string;
  songs: Song[];
};
