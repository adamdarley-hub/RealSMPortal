import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getConfig, saveConfigHandler, testServeManager, testRadar } from "./routes/config";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // API Configuration routes
  app.get("/api/config", getConfig);
  app.post("/api/config", saveConfigHandler);
  app.post("/api/test-servemanager", testServeManager);
  app.post("/api/test-radar", testRadar);

  return app;
}
