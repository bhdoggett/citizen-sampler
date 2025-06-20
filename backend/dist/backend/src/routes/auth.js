"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// import requireJwtAuth from "src/middleware/requireJwtAuth";
const resend_1 = require("resend");
const dotenv_1 = __importDefault(require("dotenv"));
const keys_1 = __importDefault(require("../config/keys"));
require("../strategies/jwt");
require("../strategies/local");
require("../strategies/google");
dotenv_1.default.config();
const syncIndexes = async () => {
    await user_1.default.syncIndexes();
};
syncIndexes();
const { FRONTEND_URL, RESEND_API_KEY } = keys_1.default;
const router = express_1.default.Router();
const resend = new resend_1.Resend(RESEND_API_KEY);
const sendConfirmationLink = async (user, token) => {
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
router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new user_1.default({
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
        const emailToken = jsonwebtoken_1.default.sign({ id: newUser._id }, keys_1.default.EMAIL_TOKEN_SECRET, {
            expiresIn: "10s",
        });
        sendConfirmationLink(newUser, emailToken);
        res.status(201).json({
            message: "Confirmation email sent. Check your inbox.",
        });
    }
    catch (err) {
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
    if (!keys_1.default.EMAIL_TOKEN_SECRET) {
        res.status(500).json({ message: "Email token secret not configured" });
        return;
    }
    // Verify the token
    try {
        const payload = jsonwebtoken_1.default.verify(confirmToken, keys_1.default.EMAIL_TOKEN_SECRET);
        // Find the user by ID
        const user = await user_1.default.findById(payload.id);
        if (!user) {
            res.status(404).send("User not found");
            return;
        }
        user.confirmed = true;
        await user.save();
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, keys_1.default.TOKEN_SECRET, {
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
    }
    catch (err) {
        const error = err;
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
        const user = await user_1.default.findOne({ email });
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
        const confirmToken = jsonwebtoken_1.default.sign({ id: user._id }, keys_1.default.EMAIL_TOKEN_SECRET, {
            expiresIn: "15m",
        });
        // Send confirmation email (implement your email sending logic)
        await sendConfirmationLink(user, confirmToken);
        res.status(200).json({
            message: "Confirmation email resent successfully",
        });
    }
    catch (err) {
        console.error("Error resending confirmation:", err);
        res.status(500).json({ message: "Failed to resend confirmation email" });
    }
});
// Local login
router.post("/login", async (req, res, next) => {
    passport_1.default.authenticate("local", (err, user, info) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(401).json({ message: info.message });
        if (!user.confirmed) {
            return res.status(403).json({
                message: "Please confirm your email before logging in.",
            });
        }
        // Update lastLogin
        user.lastLogin = new Date();
        user.save();
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ sub: user._id }, keys_1.default.TOKEN_SECRET, {
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
    })(req, res, next);
});
// Google login
router.get("/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", (req, res, next) => {
    passport_1.default.authenticate("google", { session: false }, (err, user, info) => {
        if (err || !user) {
            console.error("Google auth failed:", err || info);
            return res.redirect(`${FRONTEND_URL}/?loginError=google-auth-failed`);
        }
        const token = jsonwebtoken_1.default.sign({ sub: user._id }, keys_1.default.TOKEN_SECRET, {
            expiresIn: "1h",
        });
        res.redirect(`${FRONTEND_URL}/?token=${token}&displayName=${user.displayName}&userId=${user._id}`);
    })(req, res, next);
});
exports.default = router;
