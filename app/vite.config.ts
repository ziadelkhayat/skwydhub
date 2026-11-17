import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SKWYD_BASE is the folder the site is served from: "/skwydhub/v2/" for the preview on GitHub Pages, "/" on portal.skwydhub.com later.
export default defineConfig({
  base: process.env.SKWYD_BASE || "/",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 900 },
});
