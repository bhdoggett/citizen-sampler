import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import User from "../models/user";
import keys from "../config/keys";
import dotenv from "dotenv";
dotenv.config();

// JWT strategy for authenticating users via JSON Web Tokens

console.log("JWT strategy initialized with secret:", keys.TOKEN_SECRET);
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: keys.TOKEN_SECRET!,
    },
    async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.sub);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);
