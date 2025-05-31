"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwtAuth_1 = __importDefault(require("../middleware/requireJwtAuth"));
const user_1 = __importDefault(require("../models/user"));
const song_1 = __importDefault(require("../models/song"));
const router = express_1.default.Router();
// Save New Song
router.post("/me/songs", requireJwtAuth_1.default, async (req, res, next) => {
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
        const existingSong = await song_1.default.findOne({ title: song.title });
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
router.put("/me/songs/:_id", requireJwtAuth_1.default, async (req, res, next) => {
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
const getPopulatedUser = async (req, res) => {
    const user = req.user;
    const userId = user._id;
    const userWithSongs = user_1.default.findById(userId);
    const populatedUser = await userWithSongs.populate("songs");
    return populatedUser;
};
// Get Saved Song Titles
router.get("/me/songs", requireJwtAuth_1.default, async (req, res, next) => {
    const populatedUser = await getPopulatedUser(req, res);
    if (!populatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const titles = populatedUser.songs.map((song) => song.title);
    if (titles.length === 0) {
        res.status(404).json({ message: "No songs found" });
    }
    res.status(200).json(titles);
});
router.get("/me/songs/:title", requireJwtAuth_1.default, async (req, res, next) => {
    const { title } = req.params;
    const populatedUser = await getPopulatedUser(req, res);
    if (!populatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const song = populatedUser.songs.find((song) => song.title === title);
    if (!song) {
        res.status(404).json({ message: "Song not found" });
        return;
    }
    res.status(200).json({ message: `Loaded Song: ${song.title}`, song });
});
exports.default = router;
