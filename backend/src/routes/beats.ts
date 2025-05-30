import express, { Request, Response, NextFunction } from "express";
import requireJwtAuth from "../middleware/requireJwtAuth";
import User, { UserDoc } from "../models/user";
import Song, { SongDoc } from "../models/song";

const router = express.Router();

// Save New Song
router.post(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("Incoming song data:", req.body.song.title);
    const { song, username } = req.body;

    if (!song || !username) {
      res.status(400).json({ message: "Missing song or username" });
      return;
    }

    const user = req.user as UserDoc;

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    try {
      const existingSong = await Song.findOne({ title: song.title });
      if (existingSong) {
        res.status(409).json({ message: "Song already exists" });
        return;
      }

      const newSong = new Song(song);

      await newSong.save(); // Save the song in the Song collection

      // Ensure no duplicates in user's song list
      if (!user.songs.includes(newSong._id)) {
        user.songs.push(newSong._id);
        await user.save();
      }

      await user.save();

      res
        .status(201)
        .json({ message: "Song successfully saved", song: newSong });
      return;
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/me/songs/:_id",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
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

    try {
      const { _id } = req.params;

      const existingSong = await Song.findOne({ _id: _id });
      if (!existingSong) {
        res.status(404).json({ message: "Song not found" });
        return;
      }

      existingSong.loops = song.loops;
      existingSong.samples = song.samples;

      await existingSong.save();

      res
        .status(201)
        .json({ message: "Song successfully saved", song: existingSong });
      return;
    } catch (err) {
      next(err);
    }
  }
);

const getPopulatedUser = async (req: Request, res: Response) => {
  const user = req.user as UserDoc;
  const userId = user._id;
  const userWithSongs = User.findById(userId);
  const populatedUser = await userWithSongs.populate("songs");

  return populatedUser as UserDoc & { songs: SongDoc[] };
};

// Get Saved Song Titles
router.get(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const populatedUser = await getPopulatedUser(req, res);

    if (!populatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const titles = populatedUser.songs.map((song: SongDoc) => song.title);
    if (titles.length === 0) {
      res.status(404).json({ message: "No songs found" });
    }
    res.status(200).json(titles);
  }
);

router.get(
  "/me/songs/:title",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { title } = req.params;
    const populatedUser = await getPopulatedUser(req, res);

    if (!populatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const song = populatedUser.songs.find(
      (song: SongDoc) => song.title === title
    );

    if (!song) {
      res.status(404).json({ message: "Song not found" });
      return;
    }

    res.status(200).json({ message: `Loaded Song: ${song.title}`, song });
  }
);

export default router;
