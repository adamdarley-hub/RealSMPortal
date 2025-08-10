import { RequestHandler } from "express";
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

async function getServeManagerConfig() {
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

async function makeServeManagerRequest(endpoint: string, options: RequestInit = {}) {
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

        if (pageJobs.length > 0) {
          allJobs.push(...pageJobs);
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
          allClients.push(...pageClients);
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

// Get all servers
export const getServers: RequestHandler = async (req, res) => {
  try {
    const { limit = '100', offset = '0' } = req.query;
    const params = new URLSearchParams();
    params.append('per_page', limit as string);
    params.append('page', Math.floor(parseInt(offset as string) / parseInt(limit as string) + 1).toString());

    const endpoint = `/servers?${params.toString()}`;
    const data = await makeServeManagerRequest(endpoint);

    // Handle different response structures
    let servers, total;
    if (data.data) {
      servers = data.data;
      total = data.total || data.data.length;
    } else if (data.servers) {
      servers = data.servers;
      total = data.total || data.servers.length;
    } else {
      servers = Array.isArray(data) ? data : [];
      total = servers.length;
    }

    res.json({ servers, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (error) {
    console.error('Error fetching servers, using mock data:', error);

    // Fallback to mock data
    const mockServers = [
      {
        id: "server1",
        name: "Adam Darley",
        email: "adam@serveportal.com",
        phone: "(512) 555-0789",
        license_number: "TX12345",
        active: true,
        territories: ["Austin", "Georgetown", "Round Rock"],
        created_date: "2023-01-15T00:00:00Z"
      }
    ];

    res.json({
      servers: mockServers,
      total: mockServers.length,
      limit: parseInt(req.query.limit as string || '100'),
      offset: parseInt(req.query.offset as string || '0'),
      mock: true
    });
  }
};

// Get invoices
export const getInvoices: RequestHandler = async (req, res) => {
  try {
    const { 
      status, 
      client_id, 
      date_from, 
      date_to, 
      limit = '50', 
      offset = '0' 
    } = req.query;
    
    const params = new URLSearchParams();
    if (status) params.append('status', status as string);
    if (client_id) params.append('client_id', client_id as string);
    if (date_from) params.append('date_from', date_from as string);
    if (date_to) params.append('date_to', date_to as string);
    params.append('limit', limit as string);
    params.append('offset', offset as string);
    
    const endpoint = `/invoices?${params.toString()}`;
    const data = await makeServeManagerRequest(endpoint);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices from ServeManager',
      message: error instanceof Error ? error.message : 'Unknown error'
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
