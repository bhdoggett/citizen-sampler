"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const keys_1 = __importDefault(require("../config/keys"));
const requireJwtAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res
            .status(401)
            .json({ message: "Authorization header missing or malformed" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        if (!keys_1.default.TOKEN_SECRET) {
            throw new Error("Missing TOKEN_SECRET in environment variables");
        }
        const payload = jsonwebtoken_1.default.verify(token, keys_1.default.TOKEN_SECRET);
        const user = await user_1.default.findById(payload.sub);
        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }
        req.user = user;
        next();
    }
    catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
};
exports.default = requireJwtAuth;
