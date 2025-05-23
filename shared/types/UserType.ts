import type { SongType } from "./audioTypes";

export type UserType = {
  _id: string;
  username?: string;
  password?: string;
  email?: string;
  googleId?: string;
  lastLogin: Date;
  createdAt: Date;
  songs: SongType[];
};
