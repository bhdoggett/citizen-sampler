import express from "express";
import passport from "passport";
import cors from "cors";
import mongoose from "mongoose";
import auth from "./routes/auth";
// import beats from "./routes/beats";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// CORS setup to allow credentials (cookies) from frontend
app.use(
  cors({
    origin: process.env.CORS_FRONTEND_URL,
    credentials: true, // Allow cookies
  })
);

const PORT = process.env.PORT || 8000;

app.use(passport.initialize());
app.use(express.json());
app.use("/auth", auth);
// app.use("/beats", beats);

mongoose.connect("mongodb://localhost:27017/citizen-sampler");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/debug-session", (req, res) => {
  res.json(req.session);
});

app.get("/test", (req, res) => {
  res.send("Hello Test!");
});

app.post("/temp-song", (req, res) => {
  req.session.tempSong = req.body;
  res.json({ message: "Temporary song saved" });
});

app.get("/temp-song", (req, res) => {
  res.json(req.session.tempSong || null);
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
