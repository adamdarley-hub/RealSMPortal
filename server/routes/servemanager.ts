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

// Get all jobs with optional filtering
export const getJobs: RequestHandler = async (req, res) => {
  try {
    console.log('=== JOBS DEBUG ===');

    const config = await getServeManagerConfig();
    console.log('API Key exists:', !!config.apiKey);
    console.log('Base URL:', config.baseUrl);

    const {
      status,
      priority,
      client_id,
      server_id,
      date_from,
      date_to,
      limit = '50',
      offset = '0'
    } = req.query;

    // ServeManager might use different parameter names, let's try both
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status as string);
    if (priority && priority !== 'all') params.append('priority', priority as string);
    if (client_id && client_id !== 'all') params.append('client_id', client_id as string);
    if (server_id && server_id !== 'all') params.append('server_id', server_id as string);
    if (date_from) params.append('date_from', date_from as string);
    if (date_to) params.append('date_to', date_to as string);

    // Try pagination with per_page parameter (common in APIs)
    params.append('per_page', limit as string);
    params.append('page', Math.floor(parseInt(offset as string) / parseInt(limit as string) + 1).toString());

    const endpoint = `/jobs?${params.toString()}`;
    console.log('Fetching from:', `${config.baseUrl}${endpoint}`);

    const data = await makeServeManagerRequest(endpoint);
    console.log('Response keys:', Object.keys(data));
    console.log('Data length:', data.data?.length || data.jobs?.length || 'No data/jobs array');
    console.log('First job:', data.data?.[0] || data.jobs?.[0] || 'No jobs found');
    console.log('==================');

    // Handle different response structures
    let jobs, total;
    if (data.data) {
      jobs = data.data;
      total = data.total || data.data.length;
    } else if (data.jobs) {
      jobs = data.jobs;
      total = data.total || data.jobs.length;
    } else if (Array.isArray(data)) {
      jobs = data;
      total = data.length;
    } else {
      jobs = [];
      total = 0;
    }

    res.json({
      jobs,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('Jobs API failed, falling back to mock data');

    // Fallback to mock data if API fails
    const mockJobs = [
      {
        id: "20527876",
        job_number: "20527876",
        client: { id: "client1", name: "Pronto Process Service", company: "Pronto Process Service" },
        recipient: {
          name: "Robert Eskridge",
          address: {
            street: "1920 WILWOOD DRIVE",
            city: "ROUND ROCK",
            state: "TX",
            zip: "78681",
            full_address: "1920 WILWOOD DRIVE, ROUND ROCK TX 78681"
          }
        },
        status: "pending",
        priority: "routine",
        server: { id: "server1", name: "Adam Darley" },
        due_date: null,
        created_date: "2024-01-15T10:00:00Z",
        amount: 50.00,
        description: "Service of Process - Divorce Papers",
        service_type: "Service"
      }
    ];

    res.json({
      jobs: mockJobs,
      total: mockJobs.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
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

// Get all clients
export const getClients: RequestHandler = async (req, res) => {
  try {
    const { limit = '100', offset = '0' } = req.query;
    const params = new URLSearchParams();
    params.append('per_page', limit as string);
    params.append('page', Math.floor(parseInt(offset as string) / parseInt(limit as string) + 1).toString());

    const endpoint = `/clients?${params.toString()}`;
    const data = await makeServeManagerRequest(endpoint);

    // Handle different response structures
    let clients, total;
    if (data.data) {
      clients = data.data;
      total = data.total || data.data.length;
    } else if (data.clients) {
      clients = data.clients;
      total = data.total || data.clients.length;
    } else {
      clients = Array.isArray(data) ? data : [];
      total = clients.length;
    }

    res.json({ clients, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (error) {
    console.error('Error fetching clients, using mock data:', error);

    // Fallback to mock data
    const mockClients = [
      {
        id: "client1",
        name: "Pronto Process Service",
        company: "Pronto Process Service",
        email: "info@prontoprocess.com",
        phone: "(512) 555-0123",
        address: { street: "123 Main St", city: "Austin", state: "TX", zip: "78701" },
        created_date: "2023-06-15T00:00:00Z",
        active: true
      }
    ];

    res.json({
      clients: mockClients,
      total: mockClients.length,
      limit: parseInt(req.query.limit as string || '100'),
      offset: parseInt(req.query.offset as string || '0'),
      mock: true
    });
  }
};

// Get all servers
export const getServers: RequestHandler = async (req, res) => {
  try {
    const { limit = '100', offset = '0' } = req.query;
    const params = new URLSearchParams();
    params.append('limit', limit as string);
    params.append('offset', offset as string);
    
    const endpoint = `/servers?${params.toString()}`;
    const data = await makeServeManagerRequest(endpoint);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch servers from ServeManager',
      message: error instanceof Error ? error.message : 'Unknown error'
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
