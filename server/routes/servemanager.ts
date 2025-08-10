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

    // Build query parameters for ServeManager API
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status as string);
    if (priority && priority !== 'all') params.append('priority', priority as string);
    if (client_id && client_id !== 'all') params.append('client_id', client_id as string);
    if (server_id && server_id !== 'all') params.append('server_id', server_id as string);
    if (date_from) params.append('date_from', date_from as string);
    if (date_to) params.append('date_to', date_to as string);
    params.append('limit', limit as string);
    params.append('offset', offset as string);

    const endpoint = `/jobs?${params.toString()}`;
    const data = await makeServeManagerRequest(endpoint);

    res.json(data);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to fetch jobs from ServeManager',
      message: errorMessage,
      configured: false
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
    params.append('limit', limit as string);
    params.append('offset', offset as string);
    
    const endpoint = `/clients?${params.toString()}`;
    const data = await makeServeManagerRequest(endpoint);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clients from ServeManager',
      message: error instanceof Error ? error.message : 'Unknown error'
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
