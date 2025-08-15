import { RequestHandler } from "express";
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { mapJobFromServeManager, mapClientFromServeManager, mapServerFromServeManager, mapInvoiceFromServeManager } from '../utils/servemanager-mapper';

const CONFIG_FILE = path.join(process.cwd(), '.api-config.json');
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';

function decrypt(text: string): string {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

    const parts = text.split(':');
    if (parts.length !== 2) {
      return text; // Return original if format is wrong (backward compatibility)
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    return text; // Return original if decryption fails
  }
}

export async function getServeManagerConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);

    if (!config.serveManager?.enabled) {
      throw new Error('ServeManager integration is not enabled. Please configure it in Settings → API Configuration.');
    }

    if (!config.serveManager?.baseUrl || !config.serveManager?.apiKey) {
      throw new Error('ServeManager API URL or key is missing. Please check your configuration.');
    }

    return {
      baseUrl: config.serveManager.baseUrl,
      apiKey: decrypt(config.serveManager.apiKey),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error('ServeManager is not configured yet. Please go to Settings → API Configuration to set it up.');
    }
    if (error instanceof Error && (error.message.includes('enabled') || error.message.includes('missing'))) {
      throw error;
    }
    throw new Error('ServeManager configuration not found or invalid. Please check Settings → API Configuration.');
  }
}

export async function makeServeManagerRequest(endpoint: string, options: RequestInit = {}) {
  const config = await getServeManagerConfig();

  // ServeManager uses HTTP Basic Auth with API key as username and empty password
  const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ServeManager API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Get ALL jobs with optional filtering - no pagination limits
export const getJobs: RequestHandler = async (req, res) => {
  try {
    console.log('=== FETCHING ALL JOBS ===');

    const config = await getServeManagerConfig();
    console.log('API Key exists:', !!config.apiKey);
    console.log('Base URL:', config.baseUrl);

    const {
      status,
      priority,
      client_id,
      server_id,
      date_from,
      date_to
    } = req.query;

    // Build filter parameters
    const filterParams = new URLSearchParams();
    if (status && status !== 'all') filterParams.append('status', status as string);
    if (priority && priority !== 'all') filterParams.append('priority', priority as string);
    if (client_id && client_id !== 'all') filterParams.append('client_id', client_id as string);
    if (server_id && server_id !== 'all') filterParams.append('server_id', server_id as string);
    if (date_from) filterParams.append('date_from', date_from as string);
    if (date_to) filterParams.append('date_to', date_to as string);

    // Fetch ALL jobs with pagination loop
    let allJobs: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 100; // Safety limit to prevent infinite loops

    console.log('Starting pagination loop to fetch ALL jobs...');

    while (hasMorePages && page <= maxPages) {
      const params = new URLSearchParams(filterParams);
      params.append('per_page', '100'); // Max per page
      params.append('page', page.toString());

      const endpoint = `/jobs?${params.toString()}`;
      console.log(`Fetching page ${page} from: ${config.baseUrl}${endpoint}`);

      try {
        const pageData = await makeServeManagerRequest(endpoint);

        // Handle different response structures
        let pageJobs: any[] = [];
        if (pageData.data && Array.isArray(pageData.data)) {
          pageJobs = pageData.data;
        } else if (pageData.jobs && Array.isArray(pageData.jobs)) {
          pageJobs = pageData.jobs;
        } else if (Array.isArray(pageData)) {
          pageJobs = pageData;
        }

        console.log(`Page ${page}: Found ${pageJobs.length} jobs`);

        // Log the ACTUAL structure of the first job to understand ServeManager's format
        if (pageJobs.length > 0 && page === 1) {
          console.log('=== FIRST RAW JOB FROM SERVEMANAGER ===');
          console.log(JSON.stringify(pageJobs[0], null, 2));
          console.log('=== JOB KEYS AVAILABLE ===');
          console.log('Available keys:', Object.keys(pageJobs[0]));

          // Log attempt structure if available
          if (pageJobs[0].attempts && Array.isArray(pageJobs[0].attempts)) {
            console.log('=== ATTEMPTS STRUCTURE ===');
            console.log('Number of attempts:', pageJobs[0].attempts.length);
            pageJobs[0].attempts.forEach((attempt, index) => {
              console.log(`Attempt ${index + 1}:`, {
                keys: Object.keys(attempt),
                status: attempt.status,
                result: attempt.result,
                served: attempt.served,
                method: attempt.method,
                source: attempt.source,
                device_type: attempt.device_type,
                created_via: attempt.created_via,
                app_type: attempt.app_type,
                attempt_date: attempt.attempt_date || attempt.attempted_at || attempt.date,
                photos: attempt.photos?.length || attempt.attachments?.length || attempt.misc_attachments?.length || 0
              });
            });
          }
          console.log('=====================================');
        }

        if (pageJobs.length > 0) {
          // Map ALL raw jobs through our comprehensive mapper
          const mappedJobs = pageJobs.map(rawJob => mapJobFromServeManager(rawJob));
          allJobs.push(...mappedJobs);

          // Continue if we got a full page (suggests more data)
          hasMorePages = pageJobs.length === 100;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (pageError) {
        console.error(`Error fetching page ${page}:`, pageError);
        hasMorePages = false;
      }
    }

    console.log(`=== TOTAL JOBS FETCHED: ${allJobs.length} across ${page - 1} pages ===`);

    res.json({
      jobs: allJobs,
      total: allJobs.length,
      pages_fetched: page - 1,
      complete: page <= maxPages
    });

  } catch (error) {
    console.error('Error fetching all jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('Jobs API failed, falling back to mock data');

    // Enhanced mock data with more variety
    const mockJobs = [
      {
        id: "20527876", job_number: "20527876",
        client: { id: "client1", name: "Pronto Process Service", company: "Pronto Process Service" },
        recipient: { name: "Robert Eskridge", address: { street: "1920 WILWOOD DRIVE", city: "ROUND ROCK", state: "TX", zip: "78681", full_address: "1920 WILWOOD DRIVE, ROUND ROCK TX 78681" }},
        status: "pending", priority: "routine", server: { id: "server1", name: "Adam Darley" },
        due_date: null, created_date: "2024-01-15T10:00:00Z", amount: 50.00,
        description: "Service of Process - Divorce Papers", service_type: "Service"
      },
      {
        id: "20527766", job_number: "20527766",
        client: { id: "client1", name: "Pronto Process Service", company: "Pronto Process Service" },
        recipient: { name: "MINJUNG KWUN", address: { street: "291 LOCKHART LOOP", city: "GEORGETOWN", state: "TX", zip: "78628", full_address: "291 LOCKHART LOOP, GEORGETOWN TX 78628" }},
        status: "pending", priority: "routine", server: { id: "server1", name: "Adam Darley" },
        due_date: null, created_date: "2024-01-14T09:30:00Z", amount: 50.00,
        description: "Subpoena Service", service_type: "Service"
      },
      {
        id: "20508743", job_number: "20508743",
        client: { id: "client2", name: "Kerr Civil Process Service", company: "Kerr Civil Process Service" },
        recipient: { name: "WILLIAMSON CENTRAL APPRAISAL DISTRICT", address: { street: "625 FM 1460", city: "Georgetown", state: "TX", zip: "78626", full_address: "625 FM 1460, Georgetown TX 78626" }},
        status: "pending", priority: "routine", server: null,
        due_date: "2024-08-20", created_date: "2024-01-10T08:15:00Z", amount: 0.00,
        description: "Court Papers - Personal Injury", service_type: "Service"
      }
    ];

    res.json({
      jobs: mockJobs,
      total: mockJobs.length,
      mock: true,
      error: errorMessage
    });
  }
};

// Get single job details
export const getJob: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await makeServeManagerRequest(`/jobs/${id}`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ 
      error: 'Failed to fetch job from ServeManager',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get ALL clients - no pagination limits
export const getClients: RequestHandler = async (req, res) => {
  try {
    console.log('=== FETCHING ALL CLIENTS ===');

    // Fetch ALL clients with pagination loop
    let allClients: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 50; // Safety limit

    while (hasMorePages && page <= maxPages) {
      const params = new URLSearchParams();
      params.append('per_page', '100'); // Max per page
      params.append('page', page.toString());

      const endpoint = `/clients?${params.toString()}`;
      console.log(`Fetching clients page ${page}`);

      try {
        const pageData = await makeServeManagerRequest(endpoint);

        // Handle different response structures
        let pageClients: any[] = [];
        if (pageData.data && Array.isArray(pageData.data)) {
          pageClients = pageData.data;
        } else if (pageData.clients && Array.isArray(pageData.clients)) {
          pageClients = pageData.clients;
        } else if (Array.isArray(pageData)) {
          pageClients = pageData;
        }

        console.log(`Clients page ${page}: Found ${pageClients.length} clients`);

        if (pageClients.length > 0) {
          // Map ALL raw clients through our comprehensive mapper
          const mappedClients = pageClients.map(rawClient => mapClientFromServeManager(rawClient));
          allClients.push(...mappedClients);

          hasMorePages = pageClients.length === 100;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (pageError) {
        console.error(`Error fetching clients page ${page}:`, pageError);
        hasMorePages = false;
      }
    }

    console.log(`=== TOTAL CLIENTS FETCHED: ${allClients.length} ===`);

    res.json({
      clients: allClients,
      total: allClients.length,
      pages_fetched: page - 1
    });

  } catch (error) {
    console.error('Error fetching all clients, using mock data:', error);

    // Enhanced mock data
    const mockClients = [
      {
        id: "client1", name: "Pronto Process Service", company: "Pronto Process Service",
        email: "info@prontoprocess.com", phone: "(512) 555-0123",
        address: { street: "123 Main St", city: "Austin", state: "TX", zip: "78701" },
        created_date: "2023-06-15T00:00:00Z", active: true
      },
      {
        id: "client2", name: "Kerr Civil Process Service", company: "Kerr Civil Process Service",
        email: "contact@kerrprocess.com", phone: "(512) 555-0456",
        address: { street: "456 Oak Ave", city: "Georgetown", state: "TX", zip: "78626" },
        created_date: "2023-08-20T00:00:00Z", active: true
      },
      {
        id: "client3", name: "Johnson & Associates Law", company: "Johnson & Associates Law",
        email: "admin@johnsonlaw.com", phone: "(512) 555-0789",
        address: { street: "789 Legal Lane", city: "Round Rock", state: "TX", zip: "78664" },
        created_date: "2023-03-10T00:00:00Z", active: true
      }
    ];

    res.json({
      clients: mockClients,
      total: mockClients.length,
      mock: true
    });
  }
};

// Get ALL servers/employees - no pagination limits
export const getServers: RequestHandler = async (req, res) => {
  try {
    console.log('=== FETCHING ALL SERVERS/EMPLOYEES ===');

    // Try multiple endpoints as ServeManager might use different names
    const endpointsToTry = ['/servers', '/employees', '/staff', '/process_servers'];
    let allServers: any[] = [];
    let successfulEndpoint = '';

    for (const baseEndpoint of endpointsToTry) {
      try {
        console.log(`Trying endpoint: ${baseEndpoint}`);

        let page = 1;
        let hasMorePages = true;
        const maxPages = 50;
        let endpointServers: any[] = [];

        while (hasMorePages && page <= maxPages) {
          const params = new URLSearchParams();
          params.append('per_page', '100');
          params.append('page', page.toString());

          const endpoint = `${baseEndpoint}?${params.toString()}`;

          try {
            const pageData = await makeServeManagerRequest(endpoint);

            // Handle different response structures
            let pageServers: any[] = [];
            if (pageData.data && Array.isArray(pageData.data)) {
              pageServers = pageData.data;
            } else if (pageData.servers && Array.isArray(pageData.servers)) {
              pageServers = pageData.servers;
            } else if (pageData.employees && Array.isArray(pageData.employees)) {
              pageServers = pageData.employees;
            } else if (pageData.staff && Array.isArray(pageData.staff)) {
              pageServers = pageData.staff;
            } else if (Array.isArray(pageData)) {
              pageServers = pageData;
            }

            console.log(`${baseEndpoint} page ${page}: Found ${pageServers.length} servers`);

            if (pageServers.length > 0) {
              // Map ALL raw servers through our comprehensive mapper
              const mappedServers = pageServers.map(rawServer => mapServerFromServeManager(rawServer));
              endpointServers.push(...mappedServers);

              hasMorePages = pageServers.length === 100;
              page++;
            } else {
              hasMorePages = false;
            }
          } catch (pageError) {
            console.error(`Error fetching ${baseEndpoint} page ${page}:`, pageError);
            hasMorePages = false;
          }
        }

        if (endpointServers.length > 0) {
          allServers = endpointServers;
          successfulEndpoint = baseEndpoint;
          console.log(`Successfully fetched ${allServers.length} servers from ${baseEndpoint}`);
          break;
        }
      } catch (endpointError) {
        console.log(`Endpoint ${baseEndpoint} failed, trying next...`);
      }
    }

    console.log(`=== TOTAL SERVERS FETCHED: ${allServers.length} from ${successfulEndpoint} ===`);

    res.json({
      servers: allServers,
      total: allServers.length,
      endpoint_used: successfulEndpoint
    });

  } catch (error) {
    console.error('Error fetching all servers, using mock data:', error);

    // Enhanced mock data with more servers
    const mockServers = [
      {
        id: "server1", name: "Adam Darley", email: "adam@serveportal.com", phone: "(512) 555-0789",
        license_number: "TX12345", active: true, territories: ["Austin", "Georgetown", "Round Rock"],
        created_date: "2023-01-15T00:00:00Z"
      },
      {
        id: "server2", name: "Sarah Wilson", email: "sarah@serveportal.com", phone: "(512) 555-0234",
        license_number: "TX12346", active: true, territories: ["Austin", "Cedar Park"],
        created_date: "2023-02-20T00:00:00Z"
      },
      {
        id: "server3", name: "Mike Rodriguez", email: "mike@serveportal.com", phone: "(512) 555-0567",
        license_number: "TX12347", active: true, territories: ["Georgetown", "Leander"],
        created_date: "2023-04-10T00:00:00Z"
      }
    ];

    res.json({
      servers: mockServers,
      total: mockServers.length,
      mock: true
    });
  }
};

// Get ALL invoices with optional filtering - no pagination limits
export const getInvoices: RequestHandler = async (req, res) => {
  try {
    console.log('=== FETCHING ALL INVOICES ===');

    const { status, client_id, date_from, date_to } = req.query;

    // Build filter parameters
    const filterParams = new URLSearchParams();
    if (status && status !== 'all') filterParams.append('status', status as string);
    if (client_id && client_id !== 'all') filterParams.append('client_id', client_id as string);
    if (date_from) filterParams.append('date_from', date_from as string);
    if (date_to) filterParams.append('date_to', date_to as string);

    // Fetch ALL invoices with pagination loop
    let allInvoices: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 50;

    while (hasMorePages && page <= maxPages) {
      const params = new URLSearchParams(filterParams);
      params.append('per_page', '100');
      params.append('page', page.toString());

      const endpoint = `/invoices?${params.toString()}`;
      console.log(`Fetching invoices page ${page}`);

      try {
        const pageData = await makeServeManagerRequest(endpoint);

        // Handle different response structures
        let pageInvoices: any[] = [];
        if (pageData.data && Array.isArray(pageData.data)) {
          pageInvoices = pageData.data;
        } else if (pageData.invoices && Array.isArray(pageData.invoices)) {
          pageInvoices = pageData.invoices;
        } else if (Array.isArray(pageData)) {
          pageInvoices = pageData;
        }

        console.log(`Invoices page ${page}: Found ${pageInvoices.length} invoices`);


        if (pageInvoices.length > 0) {
          allInvoices.push(...pageInvoices);
          hasMorePages = pageInvoices.length === 100;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (pageError) {
        console.error(`Error fetching invoices page ${page}:`, pageError);
        hasMorePages = false;
      }
    }

    console.log(`=== TOTAL INVOICES FETCHED: ${allInvoices.length} ===`);
    console.log('📋 Sample invoice IDs from API:', allInvoices.slice(0, 5).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      servemanager_id: inv.servemanager_id
    })));

    // Use local client cache for performance (no additional API call needed)
    let clientsCache: any[] = [];
    try {
      const cacheService = await import('../services/cache-service');
      clientsCache = await cacheService.getClientsFromCache();
      console.log(`✅ Using ${clientsCache.length} cached clients for invoice mapping`);
    } catch (error) {
      console.warn('Could not fetch cached clients for invoice mapping:', error);
    }

    // Transform invoices using mapper to ensure consistent data structure
    const mappedInvoices = allInvoices.map(invoice => mapInvoiceFromServeManager(invoice, clientsCache));

    res.json({
      invoices: mappedInvoices,
      total: mappedInvoices.length,
      pages_fetched: page - 1
    });

  } catch (error) {
    console.error('Error fetching invoices from ServeManager API:', error);

    // Return error response for production monitoring
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        error: 'Failed to fetch invoices',
        message: 'Unable to retrieve invoice data from ServeManager',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Enhanced mock data for development
    const mockInvoices = [
      {
        id: "inv001", invoice_number: "INV-2024-001",
        client: { id: "client1", name: "Pronto Process Service", company: "Pronto Process Service" },
        jobs: [
          { id: "20527876", job_number: "20527876", amount: 50.00 },
          { id: "20527766", job_number: "20527766", amount: 50.00 }
        ],
        status: "sent", subtotal: 100.00, tax: 8.25, total: 108.25,
        created_date: "2024-01-15T00:00:00Z", due_date: "2024-02-14T00:00:00Z"
      },
      {
        id: "inv002", invoice_number: "INV-2024-002",
        client: { id: "client2", name: "Kerr Civil Process Service", company: "Kerr Civil Process Service" },
        jobs: [{ id: "20508743", job_number: "20508743", amount: 75.00 }],
        status: "paid", subtotal: 75.00, tax: 6.19, total: 81.19,
        created_date: "2024-01-10T00:00:00Z", due_date: "2024-02-09T00:00:00Z", paid_date: "2024-01-25T00:00:00Z"
      }
    ];

    // Apply mapper to mock data for consistency
    const mappedMockInvoices = mockInvoices.map(invoice => mapInvoiceFromServeManager(invoice, []));

    res.json({
      invoices: mappedMockInvoices,
      total: mappedMockInvoices.length,
      mock: true
    });
  }
};

// Get single invoice by ID
export const getInvoiceById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== FETCHING INVOICE ${id} ===`);

    // Import database and schema to avoid circular dependency
    const { db } = await import('../db/database');
    const { invoices } = await import('../db/schema');
    const { eq } = await import('drizzle-orm');

    // First try to get from database cache
    console.log(`Checking database cache for invoice ${id}...`);
    try {
      const cachedInvoice = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

      if (cachedInvoice.length > 0) {
        const invoice = cachedInvoice[0];
        console.log(`✅ Found invoice ${id} in cache:`, {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          client_id: invoice.client_id
        });

        // Transform cached invoice to expected format
        const formattedInvoice = {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          subtotal: invoice.subtotal || 0,
          tax: invoice.tax || 0,
          total: invoice.total || 0,
          created_date: invoice.created_date,
          due_date: invoice.due_date,
          paid_date: invoice.paid_date,
          client: {
            id: invoice.client_id,
            name: invoice.client_name,
            company: invoice.client_company,
            email: null,
            phone: null
          },
          jobs: invoice.jobs ? JSON.parse(invoice.jobs) : []
        };

        return res.json(formattedInvoice);
      }
    } catch (dbError) {
      console.log(`Database query failed, trying ServeManager API:`, dbError);
    }

    // If not in cache, try ServeManager API
    const endpoint = `/invoices/${id}`;
    console.log(`Fetching invoice from ServeManager API: ${endpoint}`);

    try {
      const response = await makeServeManagerRequest(endpoint);
      const invoice = response.data || response;

      if (!invoice) {
        return res.status(404).json({
          error: 'Invoice not found',
          message: `Invoice with ID ${id} not found`
        });
      }

      // Get clients cache for mapping
      const clientsCache = await getCachedClients();

      // Transform invoice using mapper
      const mappedInvoice = mapInvoiceFromServeManager(invoice, clientsCache);

      console.log(`✅ Found invoice ${id} from API:`, {
        id: mappedInvoice.id,
        invoice_number: mappedInvoice.invoice_number,
        status: mappedInvoice.status,
        client_id: mappedInvoice.client?.id
      });

      res.json(mappedInvoice);

    } catch (apiError) {
      console.error(`Error fetching invoice ${id} from ServeManager API:`, apiError);

      // Before returning 404, let's check if this invoice exists in the main invoice list
      // This might be an ID mismatch between list and detail APIs
      console.log(`🔍 Invoice ${id} not found via direct API, checking if it exists in invoice list...`);

      try {
        // Get all invoices and look for this ID
        const allInvoicesResponse = await makeServeManagerRequest('/invoices?per_page=100');
        const allInvoices = allInvoicesResponse.data || allInvoicesResponse.invoices || allInvoicesResponse;

        if (Array.isArray(allInvoices)) {
          const foundInvoice = allInvoices.find(inv =>
            inv.id?.toString() === id ||
            inv.invoice_id?.toString() === id ||
            inv.invoice_number === id ||
            inv.servemanager_id?.toString() === id
          );

          if (foundInvoice) {
            console.log(`✅ Found invoice ${id} in list with different structure:`, {
              id: foundInvoice.id,
              invoice_id: foundInvoice.invoice_id,
              invoice_number: foundInvoice.invoice_number,
              servemanager_id: foundInvoice.servemanager_id
            });

            // Get clients cache for mapping
            const clientsCache = await getCachedClients();

            // Transform using mapper
            const mappedInvoice = mapInvoiceFromServeManager(foundInvoice, clientsCache);

            return res.json(mappedInvoice);
          }
        }
      } catch (listError) {
        console.log(`Could not check invoice list:`, listError);
      }

      // Return 404 if truly not found
      return res.status(404).json({
        error: 'Invoice not found',
        message: `Invoice with ID ${id} not found in database or ServeManager API`
      });
    }

  } catch (error) {
    console.error(`Error in getInvoiceById for ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to fetch invoice',
      message: 'Unable to retrieve invoice data'
    });
  }
};

// Get ALL contacts - no pagination limits
export const getContacts: RequestHandler = async (req, res) => {
  try {
    console.log('=== FETCHING ALL CONTACTS ===');

    // Try multiple endpoints as ServeManager might use different names
    const endpointsToTry = ['/contacts', '/people', '/recipients', '/individuals'];
    let allContacts: any[] = [];
    let successfulEndpoint = '';

    for (const baseEndpoint of endpointsToTry) {
      try {
        console.log(`Trying contacts endpoint: ${baseEndpoint}`);

        let page = 1;
        let hasMorePages = true;
        const maxPages = 50;
        let endpointContacts: any[] = [];

        while (hasMorePages && page <= maxPages) {
          const params = new URLSearchParams();
          params.append('per_page', '100');
          params.append('page', page.toString());

          const endpoint = `${baseEndpoint}?${params.toString()}`;

          try {
            const pageData = await makeServeManagerRequest(endpoint);

            // Handle different response structures
            let pageContacts: any[] = [];
            if (pageData.data && Array.isArray(pageData.data)) {
              pageContacts = pageData.data;
            } else if (pageData.contacts && Array.isArray(pageData.contacts)) {
              pageContacts = pageData.contacts;
            } else if (pageData.people && Array.isArray(pageData.people)) {
              pageContacts = pageData.people;
            } else if (pageData.recipients && Array.isArray(pageData.recipients)) {
              pageContacts = pageData.recipients;
            } else if (Array.isArray(pageData)) {
              pageContacts = pageData;
            }

            console.log(`${baseEndpoint} page ${page}: Found ${pageContacts.length} contacts`);

            if (pageContacts.length > 0) {
              endpointContacts.push(...pageContacts);
              hasMorePages = pageContacts.length === 100;
              page++;
            } else {
              hasMorePages = false;
            }
          } catch (pageError) {
            console.error(`Error fetching ${baseEndpoint} page ${page}:`, pageError);
            hasMorePages = false;
          }
        }

        if (endpointContacts.length > 0) {
          allContacts = endpointContacts;
          successfulEndpoint = baseEndpoint;
          console.log(`Successfully fetched ${allContacts.length} contacts from ${baseEndpoint}`);
          break;
        }
      } catch (endpointError) {
        console.log(`Contacts endpoint ${baseEndpoint} failed, trying next...`);
      }
    }

    console.log(`=== TOTAL CONTACTS FETCHED: ${allContacts.length} from ${successfulEndpoint} ===`);

    res.json({
      contacts: allContacts,
      total: allContacts.length,
      endpoint_used: successfulEndpoint
    });

  } catch (error) {
    console.error('Error fetching all contacts, using mock data:', error);

    // Mock contacts data
    const mockContacts = [
      {
        id: "contact1", name: "Robert Eskridge", email: "robert.eskridge@email.com", phone: "(512) 555-1111",
        address: { street: "1920 WILWOOD DRIVE", city: "ROUND ROCK", state: "TX", zip: "78681" },
        created_date: "2024-01-15T00:00:00Z"
      },
      {
        id: "contact2", name: "MINJUNG KWUN", email: "minjung.kwun@email.com", phone: "(512) 555-2222",
        address: { street: "291 LOCKHART LOOP", city: "GEORGETOWN", state: "TX", zip: "78628" },
        created_date: "2024-01-14T00:00:00Z"
      }
    ];

    res.json({
      contacts: mockContacts,
      total: mockContacts.length,
      mock: true
    });
  }
};

// Get ALL court cases - no pagination limits
export const getCourtCases: RequestHandler = async (req, res) => {
  try {
    console.log('=== FETCHING ALL COURT CASES ===');

    const { company_id, q } = req.query;

    // Build filter parameters
    const filterParams = new URLSearchParams();
    if (company_id && company_id !== 'all') filterParams.append('company_id', company_id as string);
    if (q) filterParams.append('q', q as string);

    // Fetch ALL court cases with pagination loop
    let allCourtCases: any[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 50;

    while (hasMorePages && page <= maxPages) {
      const params = new URLSearchParams(filterParams);
      params.append('per_page', '100');
      params.append('page', page.toString());

      const endpoint = `/court_cases?${params.toString()}`;
      console.log(`Fetching court cases page ${page}`);

      try {
        const pageData = await makeServeManagerRequest(endpoint);

        // Handle different response structures
        let pageCourtCases: any[] = [];
        if (pageData.data && Array.isArray(pageData.data)) {
          pageCourtCases = pageData.data;
        } else if (pageData.court_cases && Array.isArray(pageData.court_cases)) {
          pageCourtCases = pageData.court_cases;
        } else if (Array.isArray(pageData)) {
          pageCourtCases = pageData;
        }

        console.log(`Court cases page ${page}: Found ${pageCourtCases.length} court cases`);

        if (pageCourtCases.length > 0) {
          allCourtCases.push(...pageCourtCases);
          hasMorePages = pageCourtCases.length === 100;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (pageError) {
        console.error(`Error fetching court cases page ${page}:`, pageError);
        hasMorePages = false;
      }
    }

    console.log(`=== TOTAL COURT CASES FETCHED: ${allCourtCases.length} ===`);

    res.json({
      court_cases: allCourtCases,
      total: allCourtCases.length,
      pages_fetched: page - 1
    });

  } catch (error) {
    console.error('Error fetching all court cases, using mock data:', error);

    // Enhanced mock data
    const mockCourtCases = [
      {
        id: "case001",
        type: "court_case",
        number: "2024-CV-001234",
        plaintiff: "Smith Industries LLC",
        defendant: "Johnson Manufacturing Corp",
        filed_date: "2024-01-15",
        court_date: "2024-02-20",
        court: {
          id: "court1",
          name: "Superior Court of Travis County",
          county: "Travis",
          state: "TX"
        },
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-28T00:00:00Z"
      },
      {
        id: "case002",
        type: "court_case",
        number: "2024-CV-001567",
        plaintiff: "Davis & Associates",
        defendant: "Williams Construction Inc",
        filed_date: "2024-01-10",
        court_date: "2024-03-05",
        court: {
          id: "court2",
          name: "District Court of Harris County",
          county: "Harris",
          state: "TX"
        },
        created_at: "2024-01-10T00:00:00Z",
        updated_at: "2024-01-25T00:00:00Z"
      }
    ];

    res.json({
      court_cases: mockCourtCases,
      total: mockCourtCases.length,
      mock: true
    });
  }
};

// Create new job
export const createJob: RequestHandler = async (req, res) => {
  try {
    const jobData = req.body;
    
    const data = await makeServeManagerRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ 
      error: 'Failed to create job in ServeManager',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update job
export const updateJob: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const jobData = req.body;
    
    const data = await makeServeManagerRequest(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ 
      error: 'Failed to update job in ServeManager',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
