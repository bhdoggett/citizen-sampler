"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodKeys = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.prodKeys = {
    MONGO_URI: process.env.MONGO_URI,
    TOKEN_SECRET: process.env.TOKEN_SECRET,
    EMAIL_TOKEN_SECRET: process.env.EMAIL_TOKEN_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_APPLICATION_CREDENTIALS_BASE64: process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
    GOOGLE_DRIVE_DRUMS_FOLDER_ID: process.env.GOOGLE_DRIVE_DRUMS_FOLDER_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL,
};
