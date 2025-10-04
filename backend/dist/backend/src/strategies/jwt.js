"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const user_1 = __importDefault(require("../models/user"));
const keys_1 = __importDefault(require("../config/keys"));
// JWT strategy for authenticating users via JSON Web Tokens
passport_1.default.use(new passport_jwt_1.Strategy({
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: keys_1.default.TOKEN_SECRET,
}, async (jwt_payload, done) => {
    try {
        const user = await user_1.default.findById(jwt_payload.sub);
        if (!user)
            return done(null, false);
        return done(null, user);
    }
    catch (err) {
        return done(err, false);
    }
}));
