import { Schema, Types, model } from "mongoose";

// One-time code handed to the frontend after Google login, exchanged for a
// JWT via POST /auth/exchange. Only a SHA-256 hash of the code is stored.
export type LoginCodeType = {
  codeHash: string;
  user: Types.ObjectId;
  expiresAt: Date;
};

export const LoginCodeSchema = new Schema<LoginCodeType>({
  codeHash: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // TTL index: MongoDB removes expired codes (within ~60s of expiresAt).
  // The exchange route also checks expiresAt, so the lag doesn't matter.
  expiresAt: { type: Date, required: true, expires: 0 },
});

const LoginCode = model<LoginCodeType>("LoginCode", LoginCodeSchema);

export default LoginCode;
