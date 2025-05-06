// import { User } from "../models/user";
// import keys from "../config/keys";
// import passport from "passport";
// import { Strategy as LocalStrategy } from "passport-local";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
// import express from "express";

// const router = express.Router();
// const PORT = process.env.PORT || 8000;

// // Local Strategy - Username/Password authentication
// passport.use(new LocalStrategy(
//   (username, password, done) => {
//     // Authentication logic here
//   }
// ));

// if (!process.env.JWT_SECRET) {
//   throw new Error("JWT_SECRET is not defined in environment variables");
// }

// // JWT Strategy - For verifying token on subsequent requests
// passport.use(new JwtStrategy(
//   {
//     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//     secretOrKey: process.env.JWT_SECRET,
//   },
//   (jwtPayload, done) => {
//     // JWT verification logic here
//   }
// ));

// // Google OAuth 2.0 Strategy
// passport.use(new GoogleStrategy(
//   {
//     clientID: process.env.GOOGLE_CLIENT_ID!,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     callbackURL: `http://localhost:${PORT}/auth/google/callback`,
//   },
//   (accessToken, refreshToken, profile, done) => {
//     // Google OAuth logic here
//   }
// ));

// router.get("/login/success", (req, res) => {
//   if (req.user) {
//     res.json({
//       success: true,
//       message: "user has successfully authenticated",
//       user: req.user,
//       cookies: req.cookies,
//     });
//   }
// }")
