import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { createHash, randomBytes } from "node:crypto";
import User from "../models/user.js";
import LoginCode from "../models/loginCode.js";
import { env } from "../env.js";

const auth = new Hono();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_COOKIE = "oauth_state";
const TOKEN_TTL_SECONDS = 60 * 60 * 24;
const LOGIN_CODE_TTL_SECONDS = 60;

const callbackUrl = () => `${env.BACKEND_BASE_URL}/auth/google/callback`;

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

type GoogleProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

// Start Google login
auth.get("/google", (c) => {
  const state = crypto.randomUUID();
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.BACKEND_BASE_URL.startsWith("https://"),
    sameSite: "Lax",
    path: "/auth",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return c.redirect(`${GOOGLE_AUTH_URL}?${params}`);
});

// Google redirects back here with an authorization code
auth.get("/google/callback", async (c) => {
  const failure = () =>
    c.redirect(`${env.FRONTEND_URL}/?loginError=google-auth-failed`);

  const { code, state } = c.req.query();
  const expectedState = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: "/auth" });

  if (!code || !state || state !== expectedState) {
    console.error("Google auth failed: missing code or state mismatch");
    return failure();
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
    }
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) {
      throw new Error(`Userinfo request failed: ${await profileRes.text()}`);
    }
    const profile = (await profileRes.json()) as GoogleProfile;

    if (!profile.email || !profile.email_verified) {
      throw new Error("Google profile has no verified email");
    }

    // Accounts created with the old email/password signup get linked to
    // Google on first sign-in, since Google has verified the email.
    let user = await User.findOne({ email: profile.email });
    if (user) {
      user.googleId ??= profile.sub;
      user.lastLogin = new Date();
      await user.save();
    } else {
      user = await User.create({
        displayName: profile.name,
        googleId: profile.sub,
        email: profile.email,
      });
    }

    // Redirect with a short-lived one-time code instead of the JWT itself,
    // so the JWT never appears in a URL (history, host logs, Referer).
    const loginCode = randomBytes(32).toString("base64url");
    await LoginCode.create({
      codeHash: hashCode(loginCode),
      user: user._id,
      expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_SECONDS * 1000),
    });

    return c.redirect(`${env.FRONTEND_URL}/?${new URLSearchParams({ loginCode })}`);
  } catch (err) {
    console.error("Google auth failed:", err);
    return failure();
  }
});

// Exchange a one-time login code for a JWT
auth.post("/exchange", async (c) => {
  const body = await c.req.json().catch(() => null);
  const code = body?.code;
  if (typeof code !== "string" || !code) {
    return c.json({ message: "Missing login code" }, 400);
  }

  // findOneAndDelete makes the code single-use, even under concurrent requests
  const loginCode = await LoginCode.findOneAndDelete({
    codeHash: hashCode(code),
    expiresAt: { $gt: new Date() },
  });
  if (!loginCode) {
    return c.json({ message: "Login code invalid or expired" }, 401);
  }

  const user = await User.findById(loginCode.user);
  if (!user) {
    return c.json({ message: "User not found" }, 401);
  }

  const token = await sign(
    {
      sub: user._id.toString(),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    },
    env.TOKEN_SECRET,
    "HS256"
  );

  return c.json({
    token,
    displayName: user.displayName ?? null,
    userId: user._id.toString(),
  });
});

// Check login status
auth.get("/check-login", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { loggedIn: false, message: "login expired, please login again" },
      401
    );
  }
  try {
    await verify(authHeader.slice(7), env.TOKEN_SECRET, "HS256");
    return c.json({ loggedIn: true });
  } catch {
    return c.json(
      { loggedIn: false, message: "Login expired. Please login again." },
      401
    );
  }
});

export default auth;
