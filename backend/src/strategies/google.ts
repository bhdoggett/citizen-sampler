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
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("No email found in Google profile"), false);
        }

        const email = profile.emails[0].value;
        const googleId = profile.id;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          if (existingUser.googleId) {
            // Already linked to Google – proceed
            return done(null, existingUser);
          } else {
            // Exists but not via Google – block login
            return done(null, false, {
              message:
                "An account with this email already exists. Please log in with your password instead.",
            });
          }
        }

        const newUser = new User({
          displayName: profile.displayName,
          googleId: profile.id,
          email: profile.emails?.[0].value,
        });
        await newUser.save();

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);
