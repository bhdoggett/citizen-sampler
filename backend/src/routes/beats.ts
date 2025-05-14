import keys from "../config/keys";
import express, { Request, Response, NextFunction } from "express";
import User from "../models/user";
import { requireAuth } from "./auth";

const router = express.Router();
const PORT = process.env.PORT || 8000;

router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.get(
  "/songs",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req;
    const user = await User.find((user) => user.username === username);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json(user.songs);
  }
);

export default router;
