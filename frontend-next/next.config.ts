import type { NextConfig } from "next";

// NEXT_OUTPUT=export builds static files into out/ for the desktop app to
// serve from inside its bundle. The website keeps the default server build.
const nextConfig: NextConfig =
  process.env.NEXT_OUTPUT === "export"
    ? { output: "export", images: { unoptimized: true } }
    : {};

export default nextConfig;
