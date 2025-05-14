import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import mongoose from "mongoose";
import auth from "./routes/auth";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// CORS setup to allow credentials (cookies) from frontend
app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
    credentials: true, // Allow cookies
  })
);

const SECRET = process.env.SESSION_SECRET || "default-secret-key";
const PORT = process.env.PORT || 8000;
console.log("PORT", PORT);

app.use(
  session({
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      // sameSite: "lax", // or "strict", depending on your needs
      // secure: process.env.NODE_ENV === "production", // Set to true in production
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use("/auth", auth);

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
