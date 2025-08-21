import { configStorageService } from '../services/config-storage';

export interface ServeManagerConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  enabled: boolean;
  environment: 'test' | 'live';
}

export interface RadarConfig {
  publishableKey: string;
  secretKey: string;
  enabled: boolean;
  environment: 'test' | 'live';
}

export interface EffectiveConfig {
  serveManager: ServeManagerConfig;
  stripe: StripeConfig;
  radar: RadarConfig;
}

// Cache for configuration to avoid repeated database calls
let configCache: EffectiveConfig | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getServeManagerConfig(): Promise<ServeManagerConfig> {
  const config = await getEffectiveConfig();
  return config.serveManager;
}

export async function getStripeConfig(): Promise<StripeConfig> {
  const config = await getEffectiveConfig();
  return config.stripe;
}

export async function getRadarConfig(): Promise<RadarConfig> {
  const config = await getEffectiveConfig();
  return config.radar;
}

export async function getEffectiveConfig(): Promise<EffectiveConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return configCache;
  }

  try {
    // Try to load from persistent storage first
    const isStorageAvailable = await configStorageService.isAvailable();
    
    let config: EffectiveConfig;
    
    if (isStorageAvailable) {
      console.log('💾 ConfigHelper: Loading from persistent storage');
      const storedConfig = await configStorageService.getEffectiveConfig();
      
      config = {
        serveManager: {
          baseUrl: storedConfig.serveManager?.baseUrl || '',
          apiKey: storedConfig.serveManager?.apiKey || '',
          enabled: storedConfig.serveManager?.enabled || false,
        },
        stripe: {
          publishableKey: storedConfig.stripe?.publishableKey || '',
          secretKey: storedConfig.stripe?.secretKey || '',
          webhookSecret: storedConfig.stripe?.webhookSecret || '',
          enabled: storedConfig.stripe?.enabled || false,
          environment: storedConfig.stripe?.environment || 'test',
        },
        radar: {
          publishableKey: storedConfig.radar?.publishableKey || '',
          secretKey: storedConfig.radar?.secretKey || '',
          enabled: storedConfig.radar?.enabled || false,
          environment: storedConfig.radar?.environment || 'test',
        },
      };
    } else {
      console.log('⚠️ ConfigHelper: Storage unavailable, using environment variables and global fallback');
      
      // Fallback to environment variables and global memory
      config = {
        serveManager: {
          baseUrl: process.env.SERVEMANAGER_BASE_URL || global.tempApiConfig?.serveManager?.baseUrl || '',
          apiKey: process.env.SERVEMANAGER_API_KEY || global.tempApiConfig?.serveManager?.apiKey || '',
          enabled: Boolean(
            process.env.SERVEMANAGER_BASE_URL || 
            process.env.SERVEMANAGER_API_KEY || 
            global.tempApiConfig?.serveManager?.enabled
          ),
        },
        stripe: {
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || global.tempApiConfig?.stripe?.publishableKey || '',
          secretKey: process.env.STRIPE_SECRET_KEY || global.tempApiConfig?.stripe?.secretKey || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || global.tempApiConfig?.stripe?.webhookSecret || '',
          enabled: Boolean(process.env.STRIPE_SECRET_KEY || global.tempApiConfig?.stripe?.enabled),
          environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || global.tempApiConfig?.stripe?.environment || 'test',
        },
        radar: {
          publishableKey: process.env.RADAR_PUBLISHABLE_KEY || global.tempApiConfig?.radar?.publishableKey || '',
          secretKey: process.env.RADAR_SECRET_KEY || global.tempApiConfig?.radar?.secretKey || '',
          enabled: Boolean(process.env.RADAR_SECRET_KEY || global.tempApiConfig?.radar?.enabled),
          environment: (process.env.RADAR_ENVIRONMENT as 'test' | 'live') || global.tempApiConfig?.radar?.environment || 'test',
        },
      };
    }

    // Cache the result
    configCache = config;
    cacheTimestamp = now;
    
    console.log('✅ ConfigHelper: Configuration loaded and cached', {
      serveManagerEnabled: config.serveManager.enabled,
      serveManagerHasUrl: !!config.serveManager.baseUrl,
      serveManagerHasKey: !!config.serveManager.apiKey,
      stripeEnabled: config.stripe.enabled,
      radarEnabled: config.radar.enabled,
      source: isStorageAvailable ? 'storage' : 'fallback',
    });

    return config;
  } catch (error) {
    console.error('🚨 ConfigHelper: Error loading configuration:', error);
    
    // Return a fallback config based on environment variables only
    const fallbackConfig: EffectiveConfig = {
      serveManager: {
        baseUrl: process.env.SERVEMANAGER_BASE_URL || '',
        apiKey: process.env.SERVEMANAGER_API_KEY || '',
        enabled: Boolean(process.env.SERVEMANAGER_BASE_URL && process.env.SERVEMANAGER_API_KEY),
      },
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        enabled: Boolean(process.env.STRIPE_SECRET_KEY),
        environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || 'test',
      },
      radar: {
        publishableKey: process.env.RADAR_PUBLISHABLE_KEY || '',
        secretKey: process.env.RADAR_SECRET_KEY || '',
        enabled: Boolean(process.env.RADAR_SECRET_KEY),
        environment: (process.env.RADAR_ENVIRONMENT as 'test' | 'live') || 'test',
      },
    };

    console.log('��️ ConfigHelper: Using fallback environment-only config');
    return fallbackConfig;
  }
}

// Utility to clear the cache (useful after config updates)
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ ConfigHelper: Configuration cache cleared');
}

// Utility to validate ServeManager configuration
export function validateServeManagerConfig(config: ServeManagerConfig): boolean {
  return !!(config.baseUrl && config.apiKey && config.enabled);
}

// Utility to validate Stripe configuration
export function validateStripeConfig(config: StripeConfig): boolean {
  return !!(config.secretKey && config.enabled);
}

// Utility to validate Radar configuration
export function validateRadarConfig(config: RadarConfig): boolean {
  return !!(config.secretKey && config.enabled);
}
