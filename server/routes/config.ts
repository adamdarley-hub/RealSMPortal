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
  stripe: {
    publishableKey: string;
    secretKey: string;
    enabled: boolean;
    environment: 'test' | 'live';
    webhookSecret: string;
  };
}

const CONFIG_FILE = path.join(process.cwd(), '.api-config.json');
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';

// Modern encryption/decryption for API keys
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

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
    return text; // Return original if decryption fails (backward compatibility)
  }
}

export async function loadConfig(): Promise<Partial<ApiConfig>> {
  try {
    // First try to load from file (for local development)
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
      if (config.stripe?.secretKey && !config.stripe.secretKey.startsWith('***')) {
        config.stripe.secretKey = decrypt(config.stripe.secretKey);
      }
      if (config.stripe?.webhookSecret && !config.stripe.webhookSecret.startsWith('***')) {
        config.stripe.webhookSecret = decrypt(config.stripe.webhookSecret);
      }

      return config;
    } catch (fileError) {
      console.log('Config file not found, checking environment variables and temp storage...');
    }

    // In serverless environment, check temp storage first, then environment variables
    const tempConfig = (global as any).tempApiConfig;

    const config: Partial<ApiConfig> = {
      serveManager: {
        baseUrl: process.env.SERVEMANAGER_BASE_URL || tempConfig?.serveManager?.baseUrl || '',
        apiKey: process.env.SERVEMANAGER_API_KEY || tempConfig?.serveManager?.apiKey || '',
        enabled: Boolean(process.env.SERVEMANAGER_BASE_URL || tempConfig?.serveManager?.enabled),
        testEndpoint: '/account'
      },
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || tempConfig?.stripe?.publishableKey || '',
        secretKey: process.env.STRIPE_SECRET_KEY || tempConfig?.stripe?.secretKey || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || tempConfig?.stripe?.webhookSecret || '',
        enabled: Boolean(process.env.STRIPE_SECRET_KEY || tempConfig?.stripe?.enabled),
        environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || tempConfig?.stripe?.environment || 'test'
      },
      radar: {
        publishableKey: process.env.RADAR_PUBLISHABLE_KEY || tempConfig?.radar?.publishableKey || '',
        secretKey: process.env.RADAR_SECRET_KEY || tempConfig?.radar?.secretKey || '',
        enabled: Boolean(process.env.RADAR_SECRET_KEY || tempConfig?.radar?.enabled),
        environment: (process.env.RADAR_ENVIRONMENT as 'test' | 'live') || tempConfig?.radar?.environment || 'test'
      }
    };

    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    return {};
  }
}

async function saveConfig(config: ApiConfig): Promise<void> {
  try {
    // In serverless environments (like Vercel), we can't write to the file system
    // Instead, we'll store the configuration in memory and provide instructions
    console.log('Serverless environment detected - cannot save to file system');
    console.log('Configuration received:', JSON.stringify(config, null, 2));

    // For production serverless deployment, configurations should be set via environment variables
    console.log('To persist these settings in production:');
    console.log('1. Set environment variables in your Vercel dashboard');
    console.log('2. Use the following environment variable names:');

    if (config.serveManager?.enabled) {
      console.log('   SERVEMANAGER_BASE_URL=' + config.serveManager.baseUrl);
      console.log('   SERVEMANAGER_API_KEY=your_api_key');
    }
    if (config.stripe?.enabled) {
      console.log('   STRIPE_PUBLISHABLE_KEY=' + config.stripe.publishableKey);
      console.log('   STRIPE_SECRET_KEY=your_stripe_secret');
      console.log('   STRIPE_WEBHOOK_SECRET=your_webhook_secret');
    }

    // Store in memory for the current session (will be lost on restart)
    global.tempApiConfig = config;

  } catch (error) {
    console.error('Error processing config:', error);
    throw new Error(`Failed to process configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      stripe: config.stripe ? {
        ...config.stripe,
        secretKey: config.stripe.secretKey ? '***' + config.stripe.secretKey.slice(-4) : '',
        webhookSecret: config.stripe.webhookSecret ? '***' + config.stripe.webhookSecret.slice(-4) : '',
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
    
    console.log('About to save config...');
    await saveConfig(config);
    console.log('Config saved successfully');
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
    const { baseUrl, apiKey } = req.body;

    if (!baseUrl || !apiKey) {
      return res.status(400).json({ error: 'Base URL and API key are required' });
    }

    // ServeManager uses HTTP Basic Auth with API key as username and empty password
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');

    // Test connection to account endpoint first
    const accountResponse = await fetch(`${baseUrl}/account`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      return res.status(accountResponse.status).json({
        error: `ServeManager API error: ${accountResponse.status} ${accountResponse.statusText} - ${errorText}`
      });
    }

    // Also test companies endpoint to verify data access
    const companiesResponse = await fetch(`${baseUrl}/companies`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!companiesResponse.ok) {
      const errorText = await companiesResponse.text();
      return res.status(companiesResponse.status).json({
        error: `ServeManager API permissions error: ${companiesResponse.status} ${companiesResponse.statusText} - ${errorText}`
      });
    }

    res.json({
      message: 'ServeManager connection successful',
      status: 'Connected and operational'
    });
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

// Test Stripe connection
export const testStripe: RequestHandler = async (req, res) => {
  try {
    const { secretKey, environment } = req.body;

    if (!secretKey) {
      return res.status(400).json({ error: 'Secret key is required' });
    }

    // Validate key format
    const expectedPrefix = environment === 'test' ? 'sk_test_' : 'sk_live_';
    if (!secretKey.startsWith(expectedPrefix)) {
      return res.status(400).json({
        error: `Invalid key format for ${environment} environment. Expected key to start with ${expectedPrefix}`
      });
    }

    // Test Stripe API with account retrieval
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Stripe-Version': '2023-10-16',
      },
    });

    if (response.ok) {
      const accountData = await response.json();
      res.json({
        message: 'Stripe connection successful',
        accountId: accountData.id,
        livemode: accountData.livemode,
        environment: accountData.livemode ? 'live' : 'test'
      });
    } else {
      const errorData = await response.json();
      res.status(response.status).json({
        error: `Stripe API returned ${response.status}: ${errorData.error?.message || response.statusText}`
      });
    }
  } catch (error) {
    console.error('Stripe test error:', error);
    res.status(500).json({ error: 'Failed to test Stripe connection' });
  }
};
