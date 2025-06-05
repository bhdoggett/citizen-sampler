"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = __importDefault(require("./routes/auth"));
const keys_1 = __importDefault(require("./config/keys"));
const beats_1 = __importDefault(require("./routes/beats"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// const isDevelopment = process.env.NODE_ENV === "development";
app.use((0, cors_1.default)());
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
app.use(passport_1.default.initialize());
app.use(express_1.default.json());
app.use("/auth", auth_1.default);
app.use("/beats", beats_1.default);
if (!keys_1.default.MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment variables");
}
mongoose_1.default.connect(keys_1.default.MONGO_URI);
const db = mongoose_1.default.connection;
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
