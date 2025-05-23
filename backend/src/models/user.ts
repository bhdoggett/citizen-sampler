import { Schema, Document, model } from "mongoose";
import { SongSchema } from "./song";
import { SongType } from "../../../shared/types/audioTypes";

export type UserType = Document & {
  username?: string;
  email?: string;
  password?: string;
  googleId?: string;
  lastLogin?: Date;
  createdAt?: Date;
  songs: SongType[];
};

export const UserSchema = new Schema<UserType>({
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  songs: {
    type: [SongSchema],
    default: [],
  },
});

const User = model("User", UserSchema);

export default User;
