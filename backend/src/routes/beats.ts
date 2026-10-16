import { Hono } from "hono";
import { isValidObjectId } from "mongoose";
import requireAuth, { AuthEnv } from "../middleware/requireAuth.js";
import User, { UserDoc } from "../models/user.js";
import Song, { SongDoc } from "../models/song.js";
import { env } from "../env.js";

const beats = new Hono<AuthEnv>();

const ownsSong = (user: UserDoc, songId: string) =>
  isValidObjectId(songId) && user.songs.some((id) => id.equals(songId));

// Save new song
beats.post("/me/songs", requireAuth, async (c) => {
  const { song, userId } = await c.req.json();
  if (!song || !userId) {
    return c.json({ message: "Missing song or userId" }, 400);
  }

  const user = c.get("user");
  await user.populate<{ songs: SongDoc[] }>("songs");
  const songs = user.songs as unknown as SongDoc[];

  const title = String(song.title).trim().toLowerCase();
  if (songs.some((existing) => existing.title.trim().toLowerCase() === title)) {
    return c.json({ message: "Song already exists" }, 409);
  }

  const newSong = await Song.create(song);
  await User.updateOne({ _id: user._id }, { $addToSet: { songs: newSong._id } });

  return c.json({ message: "Song successfully saved", song: newSong }, 201);
});

// Save existing song
beats.put("/me/songs/:_id", requireAuth, async (c) => {
  const { song, userId } = await c.req.json();
  if (!song || !userId) {
    return c.json({ message: "Missing song or user Id" }, 400);
  }

  const _id = c.req.param("_id");
  if (!ownsSong(c.get("user"), _id)) {
    return c.json({ message: "Song not found" }, 404);
  }

  const existingSong = await Song.findById(_id);
  if (!existingSong) {
    return c.json({ message: "Song not found" }, 404);
  }

  existingSong.loops = song.loops;
  existingSong.samples = song.samples;
  await existingSong.save();

  return c.json({ message: "Song successfully saved", song: existingSong }, 201);
});

// Delete song
beats.delete("/me/songs/:_id", requireAuth, async (c) => {
  const user = c.get("user");
  const _id = c.req.param("_id");
  if (!ownsSong(user, _id)) {
    return c.json({ message: "Song not found" }, 404);
  }

  await Song.deleteOne({ _id });
  await User.updateOne({ _id: user._id }, { $pull: { songs: _id } });

  return c.json({ message: "Song successfully deleted" }, 200);
});

// Get saved song titles
beats.get("/me/songs", requireAuth, async (c) => {
  const user = c.get("user");
  await user.populate("songs");
  const songs = user.songs as unknown as SongDoc[];

  if (songs.length === 0) {
    return c.json({ message: "No songs found" }, 200);
  }
  return c.json(songs.map((song) => song.title), 200);
});

// Load song by title
beats.get("/me/songs/:title", requireAuth, async (c) => {
  const title = c.req.param("title");
  const user = c.get("user");
  await user.populate("songs");
  const songs = user.songs as unknown as SongDoc[];

  const song = songs.find((s) => s.title === title);
  if (!song) {
    return c.json({ message: "Song not found" }, 404);
  }
  return c.json({ message: `Loaded Song: ${song.title}`, song }, 200);
});

// Songs saved before the move to R2 store drum URLs pointing at this route,
// so redirect them to the bucket.
beats.get("/drums/:filename", (c) =>
  c.redirect(
    `${env.DRUM_BASE_URL}/${encodeURIComponent(c.req.param("filename"))}`,
    301
  )
);

export default beats;
