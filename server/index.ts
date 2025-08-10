import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getConfig, saveConfigHandler, testServeManager, testRadar } from "./routes/config";
import {
  getJobs,
  getJob,
  getClients,
  getServers,
  getInvoices,
  createJob,
  updateJob
} from "./routes/servemanager";
import {
  getMockJobs,
  getMockClients,
  getMockServers,
  getMockInvoices
} from "./routes/mock-data";

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

  // Debug endpoint
  app.post("/api/debug", (req, res) => {
    console.log('Debug endpoint hit:', req.body);
    res.json({ message: 'Debug endpoint working', received: req.body });
  });

  // ServeManager integration routes
  app.get("/api/jobs", getJobs);
  app.get("/api/jobs/:id", getJob);
  app.post("/api/jobs", createJob);
  app.put("/api/jobs/:id", updateJob);
  app.get("/api/clients", getClients);
  app.get("/api/servers", getServers);
  app.get("/api/invoices", getInvoices);

  // Mock data routes for development (fallback when ServeManager not configured)
  app.get("/api/mock/jobs", getMockJobs);
  app.get("/api/mock/clients", getMockClients);
  app.get("/api/mock/servers", getMockServers);
  app.get("/api/mock/invoices", getMockInvoices);

  return app;
}
