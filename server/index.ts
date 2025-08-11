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
  getSyncStatus as getDetailedSyncStatus,
  triggerManualSync
} from "./routes/sync-status";
import "./services/startup-sync"; // Auto-trigger initial sync
import "./services/background-sync"; // Auto-trigger background sync
import { changeDetector } from "./services/change-detector";
import { webSocketService } from "./services/websocket-service";
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

  // Debug endpoint for client data
  app.get("/api/debug/client", async (req, res) => {
    try {
      const { CacheService } = await import("./services/cache-service");
      const cacheService = new CacheService();
      const clients = await cacheService.getClientsFromCache();

      if (clients.length > 0) {
        const firstClient = clients[0];
        res.json({
          mapped: firstClient,
          rawData: firstClient._raw || 'No raw data available',
          addressDetail: firstClient.address,
          rawAddresses: firstClient._raw?.addresses || 'No addresses in raw data'
        });
      } else {
        res.json({ error: 'No clients found in cache' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
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

  // CACHED API ROUTES (Instant Response from Local Database)
  app.get("/api/jobs", getCachedJobs);        // ⚡ INSTANT - Serve from local cache
  app.get("/api/clients", getCachedClients);  // ⚡ INSTANT - Serve from local cache
  app.get("/api/servers", getCachedServers);  // ⚡ INSTANT - Serve from local cache
  app.get("/api/jobs/:id", getCachedJob);     // ⚡ INSTANT - Single job from cache

  // Cache management routes
  app.post("/api/sync", triggerManualSync);        // 🔄 Trigger manual sync with better response
  app.get("/api/sync/status", getDetailedSyncStatus); // 📊 Get detailed sync status
  app.post("/api/sync/legacy", triggerSync);       // 🔄 Legacy sync endpoint
  app.get("/api/sync/legacy-status", getSyncStatus); // 📊 Legacy sync status
  app.post("/api/force-refresh", require("./routes/force-refresh").forceRefresh); // 🔄 Clear cache and force refresh

  // Document proxy routes (handles S3 URL expiration)
  const { getDocumentProxy, getAttemptPhotoProxy } = require("./routes/document-proxy");
  const { genericProxy } = require("./routes/generic-proxy");
  const { getDocumentPreview, getDocumentDownload } = require("./routes/fresh-documents");
  app.get("/api/proxy/document/:jobId/:documentId/:type?", getDocumentProxy);      // 📄 Proxy for documents
  app.get("/api/proxy/photo/:jobId/:attemptId/:photoId", getAttemptPhotoProxy);   // 📸 Proxy for attempt photos
  app.get("/api/proxy", genericProxy);                                            // 🔗 Generic proxy for any URL

  // Fresh document endpoints (fetch fresh URLs from ServeManager on-demand)
  app.get("/api/jobs/:jobId/documents/:documentId/preview", getDocumentPreview);   // 📄 Fresh document preview
  app.get("/api/jobs/:jobId/documents/:documentId/download", getDocumentDownload); // 💾 Fresh document download

  // Direct ServeManager routes (for admin/debugging)
  app.get("/api/servemanager/jobs", getJobs);
  app.get("/api/servemanager/jobs/:id", getJob);
  app.post("/api/servemanager/jobs", createJob);
  app.put("/api/servemanager/jobs/:id", updateJob);
  app.get("/api/servemanager/clients", getClients);
  app.get("/api/servemanager/servers", getServers);
  app.get("/api/servemanager/invoices", getInvoices);
  app.get("/api/servemanager/contacts", getContacts);

  // Mock data routes for development (fallback when ServeManager not configured)
  app.get("/api/mock/jobs", getMockJobs);
  app.get("/api/mock/clients", getMockClients);
  app.get("/api/mock/servers", getMockServers);
  app.get("/api/mock/invoices", getMockInvoices);

  // Initialize real-time services after a delay to allow initial sync
  setTimeout(() => {
    changeDetector.startMonitoring();
    console.log('🚀 Real-time change detection started');
  }, 10000); // Start after 10 seconds to allow initial data load

  return app;
}

// Enhanced server creation with WebSocket support
export function createServerWithWebSockets() {
  const app = createServer();
  const server = require('http').createServer(app);

  // Attach the Express app to the server for easy access
  (server as any).app = app;

  // Initialize WebSocket service
  webSocketService.init(server);

  return server;
}
