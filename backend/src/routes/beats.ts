import keys from "../config/keys";
import express, { Request, Response, NextFunction } from "express";
import User from "../models/user";
import { UserType } from "../models/user";
import requireAuth from "./auth";

const router = express.Router();
const PORT = process.env.PORT || 8000;

router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.get(
  "/me/songs",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;
    const user = await User.findOne(
      (user: UserType) => user.username === username
    );
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json(user.songs);
  }
);

export default router;
