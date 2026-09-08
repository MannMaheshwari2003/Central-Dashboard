import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Backend runs on its own port (default 5000, see backend/server.js).
// Frontend dev server runs on 5173 and proxies /api to the backend so the
// browser only ever talks to one origin during development. For a
// production build, set VITE_API_BASE to the deployed backend URL and the
// app will call it directly instead of using the dev proxy.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.BACKEND_PORT || 5000;
  const backendTarget = `http://localhost:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
    },
  };
});
