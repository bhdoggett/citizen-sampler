import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // Node 25+ ships its own localStorage, which is undefined without a
    // backing file and hides the jsdom one. Turn it off in the test workers.
    execArgv: ["--no-experimental-webstorage"],
  },
});
