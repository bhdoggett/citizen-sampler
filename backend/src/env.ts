const required = [
  "MONGO_URI",
  "TOKEN_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "FRONTEND_URL",
  "BACKEND_BASE_URL",
  "DRUM_BASE_URL",
] as const;

type RequiredKey = (typeof required)[number];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

const read = (key: RequiredKey) => process.env[key]!.replace(/\/+$/, "");

export const env = {
  PORT: Number(process.env.PORT) || 8000,
  MONGO_URI: process.env.MONGO_URI!,
  TOKEN_SECRET: process.env.TOKEN_SECRET!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  FRONTEND_URL: read("FRONTEND_URL"),
  BACKEND_BASE_URL: read("BACKEND_BASE_URL"),
  DRUM_BASE_URL: read("DRUM_BASE_URL"),
};
