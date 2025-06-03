"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodKeys = void 0;
// dotenv.config({ path: ".env.production" });
exports.prodKeys = {
    MONGO_URI: process.env.MONGO_URI,
    TOKEN_SECRET: process.env.TOKEN_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};
