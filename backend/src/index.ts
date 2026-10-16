import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import mongoose from "mongoose";
import { env } from "./env.js";
import auth from "./routes/auth.js";
import beats from "./routes/beats.js";

const app = new Hono();

app.use(logger());
app.use(cors({ origin: env.FRONTEND_URL }));

app.get("/health", (c) =>
  c.json({ ok: true, db: mongoose.connection.readyState === 1 })
);
app.route("/auth", auth);
app.route("/beats", beats);

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: "Internal server error" }, 500);
});

await mongoose.connect(env.MONGO_URI);
console.log("Connected to MongoDB");

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server is running on port ${info.port}`);
});
