import type { SongTypeBase } from "./audioTypes.js";
import type mongoose from "mongoose";

export type SongTypeBE = SongTypeBase & {
  _id: mongoose.Types.ObjectId;
};
