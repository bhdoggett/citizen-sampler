import type { SongTypeBase } from "../../../shared/types/audioTypes";
import mongoose from "mongoose";

export type SongTypeBE = SongTypeBase & {
  _id: mongoose.Types.ObjectId;
};
