import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { handleDemo } from "./routes/demo";
import { getConfig, saveConfigHandler, testServeManager, testRadar, testStripe } from "./routes/config";
import {
  getJobs,
  getJob,
  getClients,
  getServers,
  getInvoices,
  getInvoiceById,
  getContacts,
  getCourtCases,
  createJob,
  updateJob
} from "./routes/servemanager";
import {
  getJobInvoices,
  getJobAffidavits,
  downloadJobInvoice,
  previewJobInvoice,
  downloadJobAffidavit,
  previewJobAffidavit
} from "./routes/job-invoices-affidavits";
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
import "./services/background-sync"; // Background sync enabled for production
import { changeDetector } from "./services/change-detector";
import { webSocketService } from "./services/websocket-service";
import { supabaseSyncService } from "./services/supabase-sync";
import {
  getMockJobs,
  getMockClients,
  getMockServers,
  getMockInvoices
} from "./routes/mock-data";
import {
  getSupabaseJobs,
  getSupabaseJob,
  getSupabaseClients,
  getSupabaseServers,
  triggerSupabaseSync,
  getSupabaseSyncStatus,
  syncSupabaseJob
} from "./routes/supabase-api";
import { getPublishableKey, createPaymentIntent, confirmPayment, handleWebhook, getPaymentStatus } from './routes/stripe';
import { createSetupIntent, confirmSetupIntent, processAffidavitPayment, getJobPaymentHistory, refundPayment } from './routes/setup-intents';

export async function createServer() {
  const app = express();

  // Enhanced CORS configuration for Builder.io preview
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://*.builder.io',
      'https://builder.io',
      /\.vercel\.app$/,
      /\.netlify\.app$/,
      /\.builder\.io$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Additional CORS headers for assets
  app.use('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Add compression for better performance
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute default cache
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static files from dist/spa in production
  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, '../dist/spa');

    app.use(express.static(distPath));
  }

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
  app.post("/api/test-stripe", testStripe);

  // Stripe payment processing routes (NEW - Phase 3)
  const stripeRoutes = await import("./routes/stripe.js");
  app.post("/api/stripe/create-payment-intent", stripeRoutes.createPaymentIntent);
  app.post("/api/stripe/confirm-payment", stripeRoutes.confirmPayment);

  // Stripe webhook needs raw body data
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), stripeRoutes.handleWebhook);

  app.get("/api/stripe/publishable-key", stripeRoutes.getPublishableKey);
  app.get("/api/stripe/payment-status/:invoiceId", stripeRoutes.getPaymentStatus);

  // Root route - redirect to frontend
  app.get("/", (req, res) => {
    res.redirect("http://localhost:5173/");
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

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

  // SUPABASE API ROUTES (Ultra-fast with PostgreSQL)
  app.get("/api/v2/jobs", getSupabaseJobs);          // ⚡ ULTRA-FAST - Paginated jobs from Supabase
  app.get("/api/v2/jobs/:id", getSupabaseJob);       // ⚡ ULTRA-FAST - Single job from Supabase
  app.get("/api/v2/clients", getSupabaseClients);    // ⚡ ULTRA-FAST - Clients from Supabase
  app.get("/api/v2/servers", getSupabaseServers);    // ⚡ ULTRA-FAST - Servers from Supabase
  app.post("/api/v2/sync", triggerSupabaseSync);     // 🔄 Trigger manual sync to Supabase
  app.get("/api/v2/sync/status", getSupabaseSyncStatus); // 📊 Get Supabase sync status
  app.post("/api/v2/jobs/:id/sync", syncSupabaseJob); // 🔄 Sync single job to Supabase

  // CACHED API ROUTES (Legacy - SQLite)
  app.get("/api/jobs", getCachedJobs);        // ⚡ INSTANT - Serve from local cache
  app.get("/api/clients", getCachedClients);  // ⚡ INSTANT - Serve from local cache
  app.get("/api/servers", getCachedServers);  // ⚡ INSTANT - Serve from local cache
  app.get("/api/jobs/:id", getCachedJob);     // ⚡ INSTANT - Single job from cache
  app.get("/api/contacts", getContacts);      // 📋 CONTACTS - Fetch all contacts
  app.get("/api/court_cases", getCourtCases); // ⚖️ COURT CASES - Fetch all court cases
  app.get("/api/invoices", getInvoices);      // 📄 INVOICES - Real data from ServeManager API
  app.get("/api/invoices/:id", getInvoiceById); // 📄 SINGLE INVOICE - Get invoice by ID

  // Cache management routes
  app.post("/api/sync", triggerManualSync);        // 🔄 Trigger manual sync with better response
  app.get("/api/sync/status", getDetailedSyncStatus); // 📊 Get detailed sync status
  app.post("/api/sync/legacy", triggerSync);       // 🔄 Legacy sync endpoint
  app.get("/api/sync/legacy-status", getSyncStatus); // 📊 Legacy sync status
  const { forceRefresh } = await import("./routes/force-refresh.js");
  app.post("/api/force-refresh", forceRefresh); // 🔄 Clear cache and force refresh

  // Document proxy routes (handles S3 URL expiration)
  const { getDocumentProxy, getAttemptPhotoProxy } = await import("./routes/document-proxy.js");
  const { genericProxy } = await import("./routes/generic-proxy.js");
  const { getDocumentPreview, getDocumentDownload } = await import("./routes/fresh-documents.js");
  app.get("/api/proxy/document/:jobId/:documentId/:type?", getDocumentProxy);      // 📄 Proxy for documents
  app.get("/api/proxy/photo/:jobId/:attemptId/:photoId", getAttemptPhotoProxy);   // 📸 Proxy for attempt photos
  app.get("/api/proxy", genericProxy);                                            // 🔗 Generic proxy for any URL

  // Fresh document endpoints (fetch fresh URLs from ServeManager on-demand)
  app.get("/api/jobs/:jobId/documents/:documentId/preview", getDocumentPreview);   // 📄 Fresh document preview
  app.get("/api/jobs/:jobId/documents/:documentId/download", getDocumentDownload); // 💾 Fresh document download

  // Job-specific invoices and affidavits endpoints
  app.get("/api/jobs/:jobId/invoices", getJobInvoices);                           // 🧾 Get invoices for job (issued/paid only)
  app.get("/api/jobs/:jobId/invoices/:invoiceId/preview", previewJobInvoice);     // 👁️ Preview invoice PDF
  app.get("/api/jobs/:jobId/invoices/:invoiceId/download", downloadJobInvoice);   // 💾 Download invoice PDF
  app.get("/api/jobs/:jobId/affidavits", getJobAffidavits);                      // 📜 Get affidavits for job (signed only)
  app.get("/api/jobs/:jobId/affidavits/:affidavitId/preview", previewJobAffidavit);  // 👁️ Preview affidavit PDF
  app.get("/api/jobs/:jobId/affidavits/:affidavitId/download", downloadJobAffidavit); // ���� Download affidavit PDF

  // Direct ServeManager routes (for admin/debugging)
  app.get("/api/servemanager/jobs", getJobs);
  app.get("/api/servemanager/jobs/:id", getJob);
  app.post("/api/servemanager/jobs", createJob);
  app.put("/api/servemanager/jobs/:id", updateJob);
  app.get("/api/servemanager/clients", getClients);
  app.get("/api/servemanager/servers", getServers);
  app.get("/api/servemanager/invoices", getInvoices);
  app.get("/api/servemanager/contacts", getContacts);
  app.get("/api/servemanager/court_cases", getCourtCases);

  // Mock data routes for development (fallback when ServeManager not configured)
  app.get("/api/mock/jobs", getMockJobs);
  app.get("/api/mock/clients", getMockClients);
  app.get("/api/mock/servers", getMockServers);
  app.get("/api/mock/invoices", getMockInvoices);

  // Stripe Payment Routes
  app.get("/api/stripe/publishable-key", getPublishableKey);              // 🔑 Get Stripe publishable key
  app.post("/api/stripe/payment-intents", createPaymentIntent);           // 💳 Create payment intent
  app.post("/api/stripe/confirm-payment", confirmPayment);                // ✅ Confirm payment
  app.post("/api/stripe/webhook", handleWebhook);                         // 🔔 Stripe webhook
  app.get("/api/stripe/payment-status/:id", getPaymentStatus);            // 📊 Get payment status

  // Setup Intent Routes (Bill on Affidavit)
  app.post("/api/stripe/setup-intents", createSetupIntent);               // 💳 Create setup intent for card collection
  app.post("/api/stripe/setup-intents/confirm", confirmSetupIntent);      // ✅ Confirm setup intent
  app.post("/api/stripe/affidavit-payment", processAffidavitPayment);     // 🔔 Process payment when affidavit signed
  app.get("/api/stripe/jobs/:job_id/payments", getJobPaymentHistory);     // 📊 Get payment history for job
  app.post("/api/stripe/refund", refundPayment);                          // 💰 Refund payment (admin only)

  // Initialize Supabase sync on startup
  setTimeout(async () => {
    try {
      console.log('🚀 Starting Supabase initialization...');
      await supabaseSyncService.startInitialSync();
      supabaseSyncService.startBackgroundSync();
      console.log('✅ Supabase sync services started');
    } catch (error) {
      console.warn('⚠️ Supabase sync failed to start:', error.message);
      console.log('📝 Falling back to SQLite cache system');
    }

    // Start legacy change detection as fallback
    try {
      changeDetector.startMonitoring();
      console.log('🚀 Legacy change detection started');
    } catch (error) {
      console.warn('⚠️ Legacy change detection failed to start:', error.message);
    }
  }, 5000); // Start after 5 seconds

  // SPA fallback route - must be LAST to catch all non-API routes
  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, '../dist/spa');

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// Enhanced server creation with WebSocket support
export async function createServerWithWebSockets() {
  const app = await createServer();
  const { createServer: createHttpServer } = await import('http');
  const server = createHttpServer(app);

  // Attach the Express app to the server for easy access
  (server as any).app = app;

  // Initialize WebSocket service
  webSocketService.init(server);

  return server;
}
