"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const user_1 = __importDefault(require("../models/user"));
const keys_1 = __importDefault(require("../config/keys"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: keys_1.default.GOOGLE_CLIENT_ID,
    clientSecret: keys_1.default.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BACKEND_BASE_URL}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!profile.emails || profile.emails.length === 0) {
            return done(new Error("No email found in Google profile"), false);
        }
        const email = profile.emails[0].value;
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            if (existingUser.googleId) {
                // Already linked to Google – proceed
                return done(null, existingUser);
            }
            else {
                // Exists but not via Google – block login
                return done(null, false, {
                    message: "An account with this email already exists. Please log in with your password instead.",
                });
            }
        }
        const newUser = new user_1.default({
            displayName: profile.displayName,
            googleId: profile.id,
            email: profile.emails?.[0].value,
        });
        await newUser.save();
        return done(null, newUser);
    }
    catch (err) {
        return done(err);
    }
}));
