import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User, { UserDoc } from "../models/user";
import bcrypt from "bcryptjs";
import requireJwtAuth from "src/middleware/requireJwtAuth";
import { Resend } from "resend";
import dotenv from "dotenv";
import keys from "../config/keys";
import "../strategies/jwt";
import "../strategies/local";
import "../strategies/google";
dotenv.config();

const syncIndexes = async () => {
  await User.syncIndexes();
};

syncIndexes();

const FRONTEND_URL = process.env.FRONTEND_URL || "localhost:3000";
const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Local signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
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
      displayName: username,
      password: hashedPassword,
      lastLogin: new Date(),
      createdAt: new Date(),
      songs: [],
      confirmed: false,
    });

    await newUser.save();

    const emailToken = jwt.sign({ id: newUser._id }, keys.EMAIL_TOKEN_SECRET!, {
      expiresIn: "15m",
    });

    const sendConfirmationLink = async () => {
      const { data, error } = await resend.emails.send({
        from: "CitizenSampler <no-reply@citizensampler.com>",
        to: [`${newUser.email}`],
        subject: "Confirm Email",
        html: `Click this link to confirm your email address: ${FRONTEND_URL}/confirm?token=${emailToken}.`,
      });

      if (error) {
        return console.error({ error });
      }
    };

    sendConfirmationLink();

    res.status(201).json({
      message: "Confirmation email sent. Check your inbox.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// in /api/confirm-email route:
router.get("/confirm-email", async (req, res) => {
  const { confirmToken } = req.query;
  if (!confirmToken) {
    res.status(400).json({ message: "Missing confirmation token" });
    return;
  }

  if (typeof confirmToken !== "string") {
    res.status(400).json({ message: "Invalid or missing token" });
    return;
  }

  try {
    const payload = jwt.verify(confirmToken, keys.EMAIL_TOKEN_SECRET!) as {
      id: string;
    };

    const user = await User.findById(payload.id);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    user.confirmed = true;
    await user.save();

    const accessToken = jwt.sign({ id: user._id }, keys.TOKEN_SECRET!, {
      expiresIn: "1hr",
    });

    res.status(200).json({
      message: "Email Confirmed. You can now log in.",
      token: accessToken,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    res.status(400).send("Invalid or expired confirmation link");
  }
});

// Local login
router.post("/login", async (req, res, next) => {
  passport.authenticate(
    "local",
    (err: any, user: any, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });
      if (!user.confirmed) {
        return res.status(403).json({
          message: "Please confirm your email before logging in.",
        });
      }

      // Update lastLogin
      user.lastLogin = new Date();
      user.save();

      // Generate JWT
      const token = jwt.sign({ sub: user._id }, keys.TOKEN_SECRET!, {
        expiresIn: "1h",
      });

      res.json({
        message: "Login successful",
        token,
        user: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
        },
      });
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
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "google",
      { session: false },
      (err, user: UserDoc, info) => {
        if (err || !user) {
          console.error("Google auth failed:", err || info);
          return res.redirect(`${FRONTEND_URL}/?loginError=google-auth-failed`);
        }

        const token = jwt.sign({ sub: user._id }, keys.TOKEN_SECRET!, {
          expiresIn: "1h",
        });

        res.redirect(
          `${FRONTEND_URL}/?token=${token}&displayName=${user.displayName}&userId=${user._id}`
        );
      }
    )(req, res, next);
  }
);

// // Check login status
// router.get("/me", requireJwtAuth, (req, res) => {
//   if (req.isAuthenticated()) {
//     res.json(req.user);
//   } else {
//     res.status(401).json({ message: "Not logged in" });
//   }
// });

// I DON"T THINK I NEED THIS?? Logging out on frontend by deleteing jwt
// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

export default router;
