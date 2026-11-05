import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";

const manifest = {
  manifest_version: 3,
  name: "ApplyMate",
  version: "0.1.0",
  description: "AI-powered internship application assistant.",

  minimum_chrome_version: "116",

  permissions: [
    "sidePanel",
    "activeTab",
    "scripting",
    "storage"
  ],

  host_permissions: [
    "http://127.0.0.1/*",
    "http://localhost/*"
  ],

  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module"
  },

  action: {
    default_title: "Open ApplyMate"
  },

  side_panel: {
    default_path: "index.html"
  }
};

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],

  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        profile: "profile.html"
      }
    }
  }
});