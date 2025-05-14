import { Schema, model } from "mongoose";
import { SongSchema } from "./song";

export const UserSchema = new Schema({
  username: { type: String, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  googleId: { type: String, unique: true, sparse: true },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  songs: { type: [SongSchema] },
});

const User = model("User", UserSchema);

export default User;
