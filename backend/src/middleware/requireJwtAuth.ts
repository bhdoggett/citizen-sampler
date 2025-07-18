// middleware/requireJwtAuth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";
import keys from "../config/keys";

const requireJwtAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Authorization header missing or malformed" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!keys.TOKEN_SECRET) {
      throw new Error("Missing TOKEN_SECRET in environment variables");
    }
    const payload = jwt.verify(token, keys.TOKEN_SECRET!) as {
      sub: string;
    };

    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

export default requireJwtAuth;
