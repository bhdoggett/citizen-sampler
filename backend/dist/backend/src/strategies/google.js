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
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: keys_1.default.GOOGLE_CLIENT_ID,
    clientSecret: keys_1.default.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await user_1.default.findOne({ googleId: profile.id });
        if (!user) {
            user = new user_1.default({
                displayName: profile.displayName,
                googleId: profile.id,
                email: profile.emails?.[0].value,
            });
            await user.save();
        }
        return done(null, user);
    }
    catch (err) {
        return done(err);
    }
}));
