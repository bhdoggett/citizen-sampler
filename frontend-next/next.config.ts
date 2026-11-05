import type { NextConfig } from "next";

// NEXT_OUTPUT=export builds static files into out/ for the desktop app to
// serve from inside its bundle. The website keeps the default server build.
// NEXT_PUBLIC_DESKTOP_APP marks the desktop build so the UI can hide
// website-only parts, like the download link.
const nextConfig: NextConfig =
  process.env.NEXT_OUTPUT === "export"
    ? {
        output: "export",
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_DESKTOP_APP: "1" },
      }
    : {};

export default nextConfig;
