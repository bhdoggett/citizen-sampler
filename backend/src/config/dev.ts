import dotenv from "dotenv";
dotenv.config();

export const devKeys = {
  MONGO_URI: process.env.MONGO_URI,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
};
