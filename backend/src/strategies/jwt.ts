import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import User from "../models/user";
import dotenv from "dotenv";
dotenv.config();

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
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
