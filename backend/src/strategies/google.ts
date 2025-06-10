import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user";
import keys from "../config/keys";
import dotenv from "dotenv";
dotenv.config();

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;
console.log(BACKEND_BASE_URL);
passport.use(
  new GoogleStrategy(
    {
      clientID: keys.GOOGLE_CLIENT_ID!,
      clientSecret: keys.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${BACKEND_BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            displayName: profile.displayName,
            googleId: profile.id,
            email: profile.emails?.[0].value,
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
