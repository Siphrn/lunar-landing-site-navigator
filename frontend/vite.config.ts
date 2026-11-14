import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_BASE is the URL path the site is served from: "/" locally,
// "./" on GitHub Pages (set by .github/workflows/frontend-pages.yml), so any repo name works.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
});
