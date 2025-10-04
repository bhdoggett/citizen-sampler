"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwtAuth_1 = __importDefault(require("../middleware/requireJwtAuth"));
const user_1 = __importDefault(require("../models/user"));
const song_1 = __importDefault(require("../models/song"));
const dotenv_1 = __importDefault(require("dotenv"));
const keys_1 = __importDefault(require("../config/keys"));
const fs_1 = __importDefault(require("fs"));
const googleapis_1 = require("googleapis");
dotenv_1.default.config();
const router = express_1.default.Router();
const { GOOGLE_APPLICATION_CREDENTIALS_BASE64, GOOGLE_DRIVE_DRUMS_FOLDER_ID } = keys_1.default;
if (!GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    console.error("Missing GOOGLE_APPLICATION_CREDENTIALS_BASE64");
    process.exit(1); // Exit early if the env variable isn't set
}
if (!GOOGLE_DRIVE_DRUMS_FOLDER_ID) {
    console.error("Missing GOOGLE_DRIVE_DRUMS_FOLDER_ID");
    process.exit(1); // Exit early if the env variable isn't set
}
const credentials = Buffer.from(GOOGLE_APPLICATION_CREDENTIALS_BASE64, "base64").toString("utf-8");
// Write the credentials to a temporary file
fs_1.default.writeFileSync("/tmp/credentials.json", credentials);
const auth = new googleapis_1.google.auth.GoogleAuth({
    keyFile: "/tmp/credentials.json",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = googleapis_1.google.drive({ version: "v3", auth });
// Save New Song
router.post("/me/songs", requireJwtAuth_1.default, async (req, res, next) => {
    const { song, userId } = req.body;
    if (!song || !userId) {
        res.status(400).json({ message: "Missing song or userId" });
        return;
    }
    const user = req.user;
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    await user.populate("songs");
    try {
        const existingSong = user.songs.find((existingSong) => existingSong.title.trim().toLowerCase() ===
            song.title.trim().toLowerCase());
        if (existingSong) {
            res.status(409).json({ message: "Song already exists" });
            return;
        }
        const newSong = new song_1.default(song);
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
    }
    catch (err) {
        next(err);
    }
});
// Save existing song
router.put("/me/songs/:_id", requireJwtAuth_1.default, async (req, res, next) => {
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
        const existingSong = await song_1.default.findOne({ _id: _id });
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
    }
    catch (err) {
        next(err);
    }
});
router.delete("/me/songs/:_id", requireJwtAuth_1.default, async (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    try {
        const { _id } = req.params;
        const existingSong = await song_1.default.findOne({ _id: _id });
        if (!existingSong) {
            res.status(404).json({ message: "Song not found" });
            return;
        }
        await song_1.default.deleteOne({ _id: _id });
        // Remove the song ID from user's songs array
        await user_1.default.updateOne({ _id: user._id }, { $pull: { songs: _id } });
        res.status(200).json({ message: "Song successfully deleted" });
        return;
    }
    catch (err) {
        next(err);
    }
});
// Get Saved Song Titles
router.get("/me/songs", requireJwtAuth_1.default, async (req, res, next) => {
    const user = req.user;
    await user.populate("songs");
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const songs = user.songs;
    if (!songs || songs.length === 0) {
        res.status(200).json({ message: "No songs found" });
        return;
    }
    const titles = songs.map((song) => song.title);
    res.status(200).json(titles);
});
router.get("/me/songs/:title", requireJwtAuth_1.default, async (req, res, next) => {
    const { title } = req.params;
    const user = req.user;
    await user.populate("songs");
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const songs = user.songs;
    const song = songs.find((song) => song.title === title);
    if (!song) {
        res.status(404).json({ message: "Song not found" });
        return;
    }
    res.status(200).json({ message: `Loaded Song: ${song.title}`, song });
});
// Get drumMachine audio from Google Drive
router.get("/drums/:filename", async (req, res) => {
    const { filename } = req.params;
    try {
        const list = await drive.files.list({
            q: `name='${filename}' and '${GOOGLE_DRIVE_DRUMS_FOLDER_ID}' in parents and mimeType='audio/mpeg' `,
            fields: "files(id, name)",
            pageSize: 1,
        });
        const file = list.data.files?.[0];
        if (!file?.id) {
            res.status(404).send("File not found or missing ID");
            return;
        }
        const driveRes = await drive.files.get({ fileId: file.id, alt: "media" }, { responseType: "stream" });
        res.set("Content-Type", "audio/mpeg");
        driveRes.data.pipe(res);
    }
    catch (err) {
        console.error("Drive error", err);
        res.status(500).send("Error fetching file");
    }
});
exports.default = router;
