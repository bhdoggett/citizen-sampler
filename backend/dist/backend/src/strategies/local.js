"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const user_1 = __importDefault(require("../models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
passport_1.default.use(new passport_local_1.Strategy(async (username, password, done) => {
    try {
        const user = await user_1.default.findOne({ username });
        if (!user)
            return done(null, false, { message: "Incorrect username" });
        if (!user.password)
            return done(null, false, { message: "No password set" });
        if (user.googleId)
            return done(null, false, {
                message: "This account is linked to Google. Please log in with Google.",
            });
        const match = await bcryptjs_1.default.compare(password, user.password);
        if (!match)
            return done(null, false, { message: "Incorrect password" });
        return done(null, user);
    }
    catch (err) {
        return done(err);
    }
}));
