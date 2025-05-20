import type { SongType } from "./audioTypes";
import mongoose from "mongoose";

export type UserType = {
  _id: mongoose.ObjectId;
  username?: string;
  password?: string;
  email?: string;
  googleId?: string;
  lastLogin: Date;
  createdAt: Date;
  songs: SongType[];
};
