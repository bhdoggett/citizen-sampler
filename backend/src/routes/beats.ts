import express, { Request, Response, NextFunction } from "express";
import axios, { AxiosError } from "axios";
import requireJwtAuth from "../middleware/requireJwtAuth";
import User, { UserDoc } from "../models/user";
import Song, { SongDoc } from "../models/song";
import dotenv from "dotenv";
import keys from "../config/keys";
import fs from "fs";
import { google } from "googleapis";
dotenv.config();

const router = express.Router();

const KIT_AUDIO_BASE_URL = process.env.KIT_AUDIO_BASE_URL;

const { GOOGLE_APPLICATION_CREDENTIALS_BASE64, GOOGLE_DRIVE_DRUMS_FOLDER_ID } =
  keys;

if (!GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
  console.error("Missing GOOGLE_APPLICATION_CREDENTIALS_BASE64");
  process.exit(1); // Exit early if the env variable isn't set
}

if (!GOOGLE_DRIVE_DRUMS_FOLDER_ID) {
  console.error("Missing GOOGLE_DRIVE_DRUMS_FOLDER_ID");
  process.exit(1); // Exit early if the env variable isn't set
}

const credentials = Buffer.from(
  GOOGLE_APPLICATION_CREDENTIALS_BASE64,
  "base64"
).toString("utf-8");

// Write the credentials to a temporary file
fs.writeFileSync("/tmp/credentials.json", credentials);

const auth = new google.auth.GoogleAuth({
  keyFile: "/tmp/credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

// Save New Song
router.post(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { song, userId } = req.body;

    if (!song || !userId) {
      res.status(400).json({ message: "Missing song or userId" });
      return;
    }

    const user = req.user as UserDoc;

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await user.populate("songs");

    try {
      const existingSong = user.songs.find(
        (existingSong: any) =>
          existingSong.title.trim().toLowerCase() ===
          song.title.trim().toLowerCase()
      );
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

// Save existing song
router.put(
  "/me/songs/:_id",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { song, userId } = req.body;

    if (!song || !userId) {
      res.status(400).json({ message: "Missing song or user Id" });
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

// Get Saved Song Titles
router.get(
  "/me/songs",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as UserDoc;
    await user.populate("songs");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const songs = user.songs as unknown as SongDoc[];
    if (!songs || songs.length === 0) {
      res.status(200).json({ message: "No songs found" });
      return;
    }

    const titles = songs.map((song: SongDoc) => song.title);

    res.status(200).json(titles);
  }
);

router.get(
  "/me/songs/:title",
  requireJwtAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { title } = req.params;
    const user = req.user as UserDoc;

    await user.populate("songs");
    // const populatedUser = await getPopulatedUser(req, res);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const songs = user.songs as unknown as SongDoc[];

    const song = songs.find((song: SongDoc) => song.title === title);

    if (!song) {
      res.status(404).json({ message: "Song not found" });
      return;
    }

    res.status(200).json({ message: `Loaded Song: ${song.title}`, song });
  }
);

// Get drumMachine audio from Google Drive
router.get("/drums/:filename", async (req: Request, res: Response) => {
  const { filename } = req.params;

  try {
    const list = await drive.files.list({
      q: `name='${filename}' and mimeType='audio/mpeg'`,
      fields: "files(id, name)",
      pageSize: 1,
    });

    const file = list.data.files?.[0];
    if (!file?.id) {
      res.status(404).send("File not found or missing ID");
      return;
    }

    const driveRes = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "stream" }
    );

    res.set("Content-Type", "audio/mpeg");
    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Drive error", err);
    res.status(500).send("Error fetching file");
  }
});

export default router;
