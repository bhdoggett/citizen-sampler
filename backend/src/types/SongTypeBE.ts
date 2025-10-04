import type { SongTypeBase } from "./audioTypes";
import mongoose from "mongoose";

export type SongTypeBE = SongTypeBase & {
  _id: mongoose.Types.ObjectId;
};
