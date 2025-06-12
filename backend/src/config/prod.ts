import dotenv from "dotenv";
dotenv.config();

export const prodKeys = {
  MONGO_URI: process.env.MONGO_URI,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
  EMAIL_TOKEN_SECRET: process.env.EMAIL_TOKEN_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};
