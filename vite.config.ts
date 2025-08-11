import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      }
    }
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Start backend server with WebSocket support on port 3001
      import("./server/index.js").then(({ createServerWithWebSockets }) => {
        const backendServer = createServerWithWebSockets();

        backendServer.listen(3001, () => {
          console.log(`🚀 Backend server with WebSocket support running on port 3001`);
          console.log(`🔧 API: http://localhost:3001/api`);
          console.log(`📡 WebSocket: ws://localhost:3001`);
        });
      }).catch(async () => {
        // Fallback to dynamic import if ES modules fail
        try {
          const serverModule = await import("./server");
          const backendServer = serverModule.createServerWithWebSockets();

          backendServer.listen(3001, () => {
            console.log(`🚀 Backend server with WebSocket support running on port 3001`);
            console.log(`🔧 API: http://localhost:3001/api`);
            console.log(`📡 WebSocket: ws://localhost:3001`);
          });
        } catch (error) {
          console.error("Failed to start backend server:", error);
        }
      });
    },
  };
}
