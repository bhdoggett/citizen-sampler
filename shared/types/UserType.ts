import type { Song } from "./audioTypes";

export type UserType = {
  id: string;
  email: string;
  name: string;
  songs: Song[];
};
