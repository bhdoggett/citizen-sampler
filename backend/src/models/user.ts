import { Schema, Types, model, Document, HydratedDocument } from "mongoose";
import { SongTypeBE } from "src/types/SongTypeBE";

export type UserType = {
  username?: string;
  displayName?: string;
  email?: string;
  password?: string;
  googleId?: string;
  lastLogin?: Date;
  createdAt?: Date;
  songs: Types.ObjectId[];
  confirmed?: boolean;
};

// Proper Mongoose schema typing
export type UserDoc = HydratedDocument<UserType>;

export const UserSchema = new Schema<UserType>({
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  displayName: {
    type: String,
    unique: false,
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
  songs: [
    {
      type: Schema.Types.ObjectId,
      ref: "Song",
    },
  ],
  confirmed: { type: Boolean },
});

const User = model<UserType>("User", UserSchema);

export default User;
