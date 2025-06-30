import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User, { UserDoc } from "../models/user";
import bcrypt from "bcryptjs";
// import requireJwtAuth from "src/middleware/requireJwtAuth";
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

const { FRONTEND_URL, RESEND_API_KEY } = keys;
const router = express.Router();
const resend = new Resend(RESEND_API_KEY);

const sendConfirmationLink = async (user: UserDoc, token: string) => {
  const { data, error } = await resend.emails.send({
    from: "CitizenSampler <no-reply@citizensampler.com>",
    to: [`${user.email}`],
    subject: "Confirm Email",
    html: `Click this link to confirm your email address: ${FRONTEND_URL}/confirm?token=${token}.`,
  });

  if (error) {
    console.error({ error });
    return;
  }
};

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

    sendConfirmationLink(newUser, emailToken);

    res.status(201).json({
      message: "Confirmation email sent. Check your inbox.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Confirm email
router.get("/confirm-email", async (req, res) => {
  const { confirmToken } = req.query;
  if (!confirmToken) {
    res.status(400).json({ message: "Missing confirmation token" });
    return;
  }

  // Ensure confirmToken is a string
  if (typeof confirmToken !== "string") {
    res.status(400).json({ message: "Invalid or missing token" });
    return;
  }

  if (!keys.EMAIL_TOKEN_SECRET) {
    res.status(500).json({ message: "Email token secret not configured" });
    return;
  }

  // Verify the token
  try {
    const payload = jwt.verify(confirmToken, keys.EMAIL_TOKEN_SECRET!) as {
      id: string;
    };

    // Find the user by ID
    const user = await User.findById(payload.id);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    user.confirmed = true;
    await user.save();

    const accessToken = jwt.sign({ id: user._id }, keys.TOKEN_SECRET!, {
      expiresIn: "1d",
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
    const error = err as Error;
    if (error.name === "TokenExpiredError") {
      res.status(400).json({ message: "Confirmation link expired" });
      return;
    }
    // Make this consistent with JSON format too
    res.status(400).json({ message: "Invalid or expired confirmation link" });
    return;
  }
});

// Resend confirmation email
router.post("/resend-confirmation", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if user is already confirmed
    if (user.confirmed) {
      res.status(400).json({ message: "Email already confirmed" });
      return;
    }

    // Generate new confirmation token
    const confirmToken = jwt.sign({ id: user._id }, keys.EMAIL_TOKEN_SECRET!, {
      expiresIn: "15m",
    });

    // Send confirmation email (implement your email sending logic)
    await sendConfirmationLink(user, confirmToken);

    res.status(200).json({
      message: "Confirmation email resent successfully",
    });
  } catch (err) {
    console.error("Error resending confirmation:", err);
    res.status(500).json({ message: "Failed to resend confirmation email" });
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

export default router;
