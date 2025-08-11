import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServerWithWebSockets } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
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
    configureServer(viteServer) {
      // Create Express + WebSocket server
      const server = createServerWithWebSockets();

      // Start the server on a different port for WebSocket support
      const port = 3001;
      server.listen(port, () => {
        console.log(`🚀 Backend server with WebSocket support running on port ${port}`);
        console.log(`🔧 API: http://localhost:${port}/api`);
        console.log(`📡 WebSocket: ws://localhost:${port}`);
      });

      // Proxy API calls from Vite dev server to our Express server
      viteServer.middlewares.use('/api', (req, res, next) => {
        const url = `http://localhost:${port}${req.url}`;

        // Forward the request to our Express server
        import('node-fetch').then(({ default: fetch }) => {
          const method = req.method || 'GET';
          const headers = { ...req.headers };
          delete headers.host; // Remove host header to avoid conflicts

          let body;
          if (method !== 'GET' && method !== 'HEAD') {
            // Collect request body for POST/PUT requests
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', async () => {
              body = Buffer.concat(chunks);
              try {
                const response = await fetch(url, {
                  method,
                  headers,
                  body: body.length > 0 ? body : undefined,
                });

                res.status(response.status);
                response.headers.forEach((value, key) => {
                  res.setHeader(key, value);
                });

                const responseData = await response.arrayBuffer();
                res.end(Buffer.from(responseData));
              } catch (error) {
                console.error('Proxy error:', error);
                res.status(500).json({ error: 'Proxy error' });
              }
            });
          } else {
            // Handle GET requests
            fetch(url, { method, headers })
              .then(async (response) => {
                res.status(response.status);
                response.headers.forEach((value, key) => {
                  res.setHeader(key, value);
                });

                const responseData = await response.arrayBuffer();
                res.end(Buffer.from(responseData));
              })
              .catch((error) => {
                console.error('Proxy error:', error);
                res.status(500).json({ error: 'Proxy error' });
              });
          }
        });
      });
    },
  };
}
