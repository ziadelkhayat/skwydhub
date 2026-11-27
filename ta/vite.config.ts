import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.SKWYD_BASE || "/",
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  // two pages: the back office (index.html) and the POS web app (pos.html, packaged as the Android POS with Capacitor)
  build: { rollupOptions: { input: { main: path.resolve(import.meta.dirname, "index.html"), pos: path.resolve(import.meta.dirname, "pos.html") } } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
