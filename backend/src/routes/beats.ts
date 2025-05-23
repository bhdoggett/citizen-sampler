import keys from "../config/keys";
import express, { Request, Response, NextFunction } from "express";
import User from "../models/user";
import { UserType } from "../models/user";
import requireJwtAuth from "src/middleware/requireJwtAuth";

const router = express.Router();

router.post(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /// Do STUFF HERE

    res.json({ message: "Hiya" });
    return;
  }
);

router.get(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /// Do STUFF HERE

    res.json("Hiya");
  }
);

export default router;
