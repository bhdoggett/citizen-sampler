import express from "express";
import passport from "passport";
import cors from "cors";
import mongoose from "mongoose";
import auth from "./routes/auth";
import keys from "./config/keys";
import beats from "./routes/beats";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// const isDevelopment = process.env.NODE_ENV === "development";

app.use(cors());
// if (isDevelopment) {
//   app.use(
//     cors({
//       origin: "http://localhost:3000",
//       credentials: true,
//     })
//   );
// } else {
//   app.use(
//     cors({
//       origin: "https://www.citizensampler.com",
//       credentials: true,
//     })
//   );
// }

const PORT = process.env.PORT || 8000;

app.use(passport.initialize());
app.use(express.json());
app.use("/auth", auth);
app.use("/beats", beats);

if (!keys.MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment variables");
}

mongoose.connect(keys.MONGO_URI);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/test", (req, res) => {
  res.send("Hello Test!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
