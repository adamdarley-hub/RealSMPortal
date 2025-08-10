import { RequestHandler } from "express";
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface ApiConfig {
  serveManager: {
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
    testEndpoint: string;
  };
  radar: {
    publishableKey: string;
    secretKey: string;
    enabled: boolean;
    environment: 'test' | 'live';
  };
}

const CONFIG_FILE = path.join(process.cwd(), '.api-config.json');
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';

// Simple encryption/decryption for API keys
function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes192', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text: string): string {
  try {
    const decipher = crypto.createDecipher('aes192', ENCRYPTION_KEY);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return text; // Return original if decryption fails (backward compatibility)
  }
}

async function loadConfig(): Promise<Partial<ApiConfig>> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);

    // Decrypt sensitive fields
    if (config.serveManager?.apiKey && !config.serveManager.apiKey.startsWith('***')) {
      config.serveManager.apiKey = decrypt(config.serveManager.apiKey);
    }
    if (config.radar?.secretKey && !config.radar.secretKey.startsWith('***')) {
      config.radar.secretKey = decrypt(config.radar.secretKey);
    }

    return config;
  } catch (error) {
    console.log('Config file not found, returning empty config');
    // Return empty config if file doesn't exist
    return {};
  }
}

async function saveConfig(config: ApiConfig): Promise<void> {
  try {
    const configToSave = { ...config };

    // Encrypt sensitive fields only if they exist and aren't already masked
    if (configToSave.serveManager?.apiKey && !configToSave.serveManager.apiKey.startsWith('***')) {
      configToSave.serveManager.apiKey = encrypt(configToSave.serveManager.apiKey);
    }
    if (configToSave.radar?.secretKey && !configToSave.radar.secretKey.startsWith('***')) {
      configToSave.radar.secretKey = encrypt(configToSave.radar.secretKey);
    }

    await fs.writeFile(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
  } catch (error) {
    console.error('Error saving config file:', error);
    throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get API configuration
export const getConfig: RequestHandler = async (req, res) => {
  try {
    const config = await loadConfig();
    
    // Never send actual API keys to frontend, send masked versions
    const safeConfig = {
      ...config,
      serveManager: config.serveManager ? {
        ...config.serveManager,
        apiKey: config.serveManager.apiKey ? '***' + config.serveManager.apiKey.slice(-4) : '',
      } : undefined,
      radar: config.radar ? {
        ...config.radar,
        secretKey: config.radar.secretKey ? '***' + config.radar.secretKey.slice(-4) : '',
      } : undefined,
    };
    
    res.json(safeConfig);
  } catch (error) {
    console.error('Error loading config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
};

// Save API configuration
export const saveConfigHandler: RequestHandler = async (req, res) => {
  try {
    console.log('Received config save request');
    const config: ApiConfig = req.body;
    console.log('Config received:', JSON.stringify(config, null, 2));
    
    // Validate required fields
    if (config.serveManager?.enabled && !config.serveManager.baseUrl) {
      return res.status(400).json({ error: 'ServeManager base URL is required when enabled' });
    }
    
    if (config.radar?.enabled && !config.radar.publishableKey) {
      return res.status(400).json({ error: 'radar.io publishable key is required when enabled' });
    }
    
    // Load existing config to preserve keys that weren't changed
    const existingConfig = await loadConfig();
    
    // If API key is masked, keep the existing one
    if (config.serveManager?.apiKey?.startsWith('***')) {
      config.serveManager.apiKey = existingConfig.serveManager?.apiKey || '';
    }
    
    if (config.radar?.secretKey?.startsWith('***')) {
      config.radar.secretKey = existingConfig.radar?.secretKey || '';
    }
    
    await saveConfig(config);
    res.json({ message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
    res.status(500).json({ error: errorMessage });
  }
};

// Test ServeManager connection
export const testServeManager: RequestHandler = async (req, res) => {
  try {
    const { baseUrl, apiKey, testEndpoint } = req.body;
    
    if (!baseUrl || !apiKey) {
      return res.status(400).json({ error: 'Base URL and API key are required' });
    }
    
    const testUrl = baseUrl + (testEndpoint || '/ping');
    
    // Make a test request to ServeManager API
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      res.json({ message: 'ServeManager connection successful' });
    } else {
      res.status(response.status).json({ 
        error: `ServeManager API returned ${response.status}: ${response.statusText}` 
      });
    }
  } catch (error) {
    console.error('ServeManager test error:', error);
    res.status(500).json({ error: 'Failed to test ServeManager connection' });
  }
};

// Test radar.io connection
export const testRadar: RequestHandler = async (req, res) => {
  try {
    const { publishableKey, environment } = req.body;
    
    if (!publishableKey) {
      return res.status(400).json({ error: 'Publishable key is required' });
    }
    
    // Test radar.io with a simple geocode request
    const testUrl = 'https://api.radar.io/v1/geocode/forward';
    
    const response = await fetch(`${testUrl}?query=New York, NY`, {
      headers: {
        'Authorization': publishableKey,
      },
    });
    
    if (response.ok) {
      res.json({ message: 'radar.io connection successful' });
    } else {
      res.status(response.status).json({ 
        error: `radar.io API returned ${response.status}: ${response.statusText}` 
      });
    }
  } catch (error) {
    console.error('Radar test error:', error);
    res.status(500).json({ error: 'Failed to test radar.io connection' });
  }
};
