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
          // ── Babylon.js ecosystem (split by package for granular caching) ──
          if (id.includes("@babylonjs/core")) return "vendor-babylon";
          if (id.includes("@babylonjs/gui")) return "vendor-babylon-gui";
          if (id.includes("@babylonjs/loaders")) return "vendor-babylon-loaders";
          if (id.includes("@babylonjs/materials")) return "vendor-babylon-materials";
          if (id.includes("@babylonjs/havok")) return "vendor-babylon-havok";
          if (id.includes("@babylonjs/inspector")) return "vendor-babylon-inspector";
          if (id.includes("@babylonjs/post-processes")) return "vendor-babylon-postfx";
          if (id.includes("@babylonjs/procedural-textures")) return "vendor-babylon-proctex";
          if (id.includes("@babylonjs/serializers")) return "vendor-babylon-serializers";
          // ── Three.js ──
          if (id.includes("node_modules/three")) return "vendor-three";
          // ── React ──
          if (id.includes("node_modules/react-dom")) return "vendor-react-dom";
          if (id.includes("node_modules/react") && !id.includes("react-dom")) return "vendor-react";
          // ── Networking ──
          if (id.includes("colyseus")) return "vendor-colyseus";
          if (id.includes("socket.io")) return "vendor-socketio";
          // ── Physics ──
          if (id.includes("rapier")) return "vendor-rapier";
          // ── ECS / State / Audio ──
          if (id.includes("bitecs")) return "vendor-bitecs";
          if (id.includes("zustand")) return "vendor-zustand";
          if (id.includes("howler")) return "vendor-howler";
          // ── Shader / Debug tools (editor only, lazy loaded) ──
          if (id.includes("spectorjs")) return "vendor-spector";
          if (id.includes("glsl-parser")) return "vendor-glsl";
        },
      },
    },
  },
});
