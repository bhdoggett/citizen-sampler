import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import User, { UserDoc } from "../models/user.js";
import { env } from "../env.js";

export type AuthEnv = { Variables: { user: UserDoc } };

const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "Authorization header missing or malformed" }, 401);
  }

  let sub: string;
  try {
    const payload = await verify(authHeader.slice(7), env.TOKEN_SECRET, "HS256");
    sub = String(payload.sub);
  } catch {
    return c.json({ message: "Invalid or expired token" }, 401);
  }

  const user = await User.findById(sub);
  if (!user) {
    return c.json({ message: "User not found" }, 401);
  }

  c.set("user", user);
  await next();
});

export default requireAuth;
