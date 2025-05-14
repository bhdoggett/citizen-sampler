import type { SongType } from "./audioTypes";

export type UserType = {
  id: string;
  email: string;
  name: string;
  songs: SongType[];
};
