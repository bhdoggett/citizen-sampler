import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import mongoose from "mongoose";
import auth from "./routes/auth";
import beats from "./routes/beats";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());

const SECRET = process.env.SESSION_SECRET;

app.use(
  session({
    secret: SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use("/auth", auth);
app.use("/beats", beats);

const port = process.env.PORT || 8000;

mongoose.connect("mongodb://localhost:27017/citizen-sampler");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/temp-song", (req, res) => {
  req.session.tempSong = req.body;
  res.json({ message: "Temp song saved" });
});

app.get("/temp-song", (req, res) => {
  res.json(req.session.tempSong || null);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
