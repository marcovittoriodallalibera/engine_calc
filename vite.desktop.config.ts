import { fileURLToPath } from "node:url";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(projectRoot, "desktop/renderer-src"),
  base: "./",
  publicDir: path.join(projectRoot, "public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  build: {
    outDir: path.join(projectRoot, "desktop/app/renderer"),
    emptyOutDir: true,
    sourcemap: false,
    target: "chrome144",
  },
});
