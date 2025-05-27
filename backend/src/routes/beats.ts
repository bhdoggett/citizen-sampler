import express, { Request, Response, NextFunction } from "express";

import requireJwtAuth from "../middleware/requireJwtAuth";
import User from "../models/user";
import Song from "../models/song";
import { UserType } from "../types/UserType";
import { SongType } from "../../../shared/types/audioTypes";

const router = express.Router();

/**
 * POST /me/songs
 * Add a new song to the authenticated user's list
 */
router.post(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { song, username } = req.body;

      if (!song || !username) {
        res.status(400).json({ message: "Missing song or username" });
        return;
      }

      const user = req.user;

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const newSong = new Song(song);

      await newSong.save(); // Save the song in the Song collection

      user.songs.push(newSong._id); // Push only the song ID into the user's songs array

      await user.save();

      res.status(201).json({ message: "Song added", song: newSong });
      return;
    } catch (err) {
      next(err);
    }
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
