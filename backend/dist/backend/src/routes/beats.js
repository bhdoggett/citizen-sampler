"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const requireJwtAuth_1 = __importDefault(require("../middleware/requireJwtAuth"));
const song_1 = __importDefault(require("../models/song"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const KIT_AUDIO_BASE_URL = process.env.KIT_AUDIO_BASE_URL;
const router = express_1.default.Router();
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
// Get Saved Song Titles
router.get("/me/songs", requireJwtAuth_1.default, async (req, res, next) => {
    const user = req.user;
    await user.populate("songs");
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const songs = user.songs;
    const titles = songs.map((song) => song.title);
    if (titles.length === 0) {
        res.status(404).json({ message: "No songs found" });
    }
    res.status(200).json(titles);
});
router.get("/me/songs/:title", requireJwtAuth_1.default, async (req, res, next) => {
    const { title } = req.params;
    const user = req.user;
    await user.populate("songs");
    // const populatedUser = await getPopulatedUser(req, res);
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
router.get("/drums/:filename", async (req, res) => {
    const filename = req.params.filename;
    const fullUrl = `${KIT_AUDIO_BASE_URL}/${encodeURIComponent(filename)}`;
    try {
        const audioResponse = await axios_1.default.get(fullUrl, { responseType: "stream" });
        res.set("Content-Type", "audio/mpeg");
        audioResponse.data.pipe(res);
    }
    catch (err) {
        const error = err;
        console.error("Error fetching audio:", error.message);
        res.status(500).send("Error fetching audio file");
    }
});
exports.default = router;
