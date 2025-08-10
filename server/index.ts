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
  getContacts,
  createJob,
  updateJob
} from "./routes/servemanager";
import {
  getCachedJobs,
  getCachedClients,
  getCachedServers,
  getCachedJob,
  triggerSync,
  getSyncStatus
} from "./routes/cached-api";
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

  // ServeManager API debug endpoint
  app.get("/api/debug/servemanager", async (req, res) => {
    try {
      // Import here to avoid circular dependency
      const { getServeManagerConfig } = await import("./routes/servemanager");

      const config = await getServeManagerConfig();
      console.log('=== SERVEMANAGER DEBUG ===');
      console.log('API Key configured:', !!config.apiKey);
      console.log('Base URL:', config.baseUrl);

      // Test basic connectivity
      const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');

      // Try account endpoint first
      const accountResponse = await fetch(`${config.baseUrl}/account`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Account endpoint status:', accountResponse.status);

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        console.log('Account data:', accountData);

        // Try jobs endpoint
        const jobsResponse = await fetch(`${config.baseUrl}/jobs?per_page=1`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Jobs endpoint status:', jobsResponse.status);

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          console.log('Jobs structure:', Object.keys(jobsData));
          console.log('First job:', jobsData.data?.[0] || jobsData.jobs?.[0] || 'No jobs');

          res.json({
            status: 'success',
            account: accountData,
            jobsStructure: Object.keys(jobsData),
            firstJob: jobsData.data?.[0] || jobsData.jobs?.[0] || null
          });
        } else {
          const jobsError = await jobsResponse.text();
          res.json({
            status: 'account_ok_jobs_failed',
            account: accountData,
            jobsError: jobsError,
            jobsStatus: jobsResponse.status
          });
        }
      } else {
        const accountError = await accountResponse.text();
        res.json({
          status: 'account_failed',
          accountError: accountError,
          accountStatus: accountResponse.status
        });
      }

      console.log('==========================');
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ServeManager integration routes
  app.get("/api/jobs", getJobs);
  app.get("/api/jobs/:id", getJob);
  app.post("/api/jobs", createJob);
  app.put("/api/jobs/:id", updateJob);
  app.get("/api/clients", getClients);
  app.get("/api/servers", getServers);
  app.get("/api/invoices", getInvoices);
  app.get("/api/contacts", getContacts);

  // Mock data routes for development (fallback when ServeManager not configured)
  app.get("/api/mock/jobs", getMockJobs);
  app.get("/api/mock/clients", getMockClients);
  app.get("/api/mock/servers", getMockServers);
  app.get("/api/mock/invoices", getMockInvoices);

  return app;
}
