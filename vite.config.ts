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
      // Start backend server with WebSocket support on port 3001 using child process
      const { spawn } = require('child_process');

      const backendProcess = spawn('node', ['scripts/start-backend.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Clean up on exit
      process.on('exit', () => {
        backendProcess.kill();
      });

      process.on('SIGINT', () => {
        backendProcess.kill();
        process.exit();
      });

      process.on('SIGTERM', () => {
        backendProcess.kill();
        process.exit();
      });
    },
  };
}
