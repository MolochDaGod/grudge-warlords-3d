import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * CDN_BASE: Set this env var to serve hashed assets from your CF-proxied domain.
 * e.g. VITE_CDN_BASE=https://cdn.grudge-studio.com/assets/
 * Falls back to relative paths (works on any host including Puter/Vercel).
 */
const CDN_BASE = process.env.VITE_CDN_BASE || undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  // If CDN_BASE is set, hashed assets (JS/CSS) are loaded from it
  base: CDN_BASE || "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Raise warning limit since 3D engines are inherently large
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        /**
         * manualChunks — split heavy deps into cacheable chunks.
         * Content-hashed filenames mean CF/browsers cache them indefinitely
         * until the code actually changes.
         */
        manualChunks(id) {
          // Babylon.js core engine — largest chunk, changes rarely
          if (id.includes("@babylonjs/core")) return "vendor-babylon";
          if (id.includes("@babylonjs/gui")) return "vendor-babylon-gui";
          if (id.includes("@babylonjs/loaders")) return "vendor-babylon-loaders";
          // Three.js — existing game engine
          if (id.includes("node_modules/three")) return "vendor-three";
          // React runtime
          if (id.includes("node_modules/react-dom")) return "vendor-react-dom";
          if (id.includes("node_modules/react") && !id.includes("react-dom")) return "vendor-react";
          // Colyseus networking
          if (id.includes("colyseus")) return "vendor-colyseus";
          // Physics
          if (id.includes("rapier")) return "vendor-rapier";
        },
      },
    },
  },
});
