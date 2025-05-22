import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/user";
import requireJwtAuth from "../middleware/requireJwtAuth";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import "../strategies/jwt";
import "../strategies/local";
import "../strategies/google";

dotenv.config();

const router = express.Router();

// Local signup
router.post(
  "/signup/local",
  async (req: Request, res: Response): Promise<void> => {
    const { username, email, password } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        googleId: null,
        lastLogin: new Date(),
        createdAt: new Date(),
        songs: [],
      });

      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "Signup successful",
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
        },
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Local login
router.post("/login", async (req, res, next) => {
  passport.authenticate(
    "local",
    (err: any, user: any, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });

      // Generate JWT
      const token = jwt.sign(
        { sub: user._id, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: "1h" }
      );

      res.json({ message: "Login successful", token });
    }
  )(req, res, next);
});

// Google login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/", // or redirect to frontend route
  })
);

// Check login status
router.get("/me", requireJwtAuth, (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

export default router;
