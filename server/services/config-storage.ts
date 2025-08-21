import { supabase, isSupabaseConfigured } from '../../shared/supabase';

export interface StoredApiConfig {
  id: string;
  service_name: string; // 'servemanager', 'stripe', 'radar'
  base_url?: string;
  api_key?: string;
  publishable_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  environment?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiConfigData {
  serveManager?: {
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
    testEndpoint: string;
  };
  stripe?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    enabled: boolean;
    environment: 'test' | 'live';
  };
  radar?: {
    publishableKey: string;
    secretKey: string;
    enabled: boolean;
    environment: 'test' | 'live';
  };
}

export class ConfigStorageService {
  
  async isAvailable(): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        console.log('💾 ConfigStorage: Supabase not configured, using fallback');
        return false;
      }

      // Test connection by trying to query the api_configurations table
      const { error } = await supabase
        .from('api_configurations')
        .select('id')
        .limit(1);

      if (error) {
        console.log('💾 ConfigStorage: Table not available, using fallback:', error.message);
        return false;
      }

      console.log('💾 ConfigStorage: Available and ready');
      return true;
    } catch (error) {
      console.log('💾 ConfigStorage: Error checking availability:', error);
      return false;
    }
  }

  async saveConfig(configData: ApiConfigData): Promise<void> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error('Configuration storage is not available');
      }

      const timestamp = new Date().toISOString();
      const configsToSave: Partial<StoredApiConfig>[] = [];

      // Prepare ServeManager config
      if (configData.serveManager) {
        configsToSave.push({
          service_name: 'servemanager',
          base_url: configData.serveManager.baseUrl,
          api_key: configData.serveManager.apiKey,
          enabled: configData.serveManager.enabled,
          updated_at: timestamp,
        });
      }

      // Prepare Stripe config
      if (configData.stripe) {
        configsToSave.push({
          service_name: 'stripe',
          publishable_key: configData.stripe.publishableKey,
          secret_key: configData.stripe.secretKey,
          webhook_secret: configData.stripe.webhookSecret,
          environment: configData.stripe.environment,
          enabled: configData.stripe.enabled,
          updated_at: timestamp,
        });
      }

      // Prepare Radar config
      if (configData.radar) {
        configsToSave.push({
          service_name: 'radar',
          publishable_key: configData.radar.publishableKey,
          secret_key: configData.radar.secretKey,
          environment: configData.radar.environment,
          enabled: configData.radar.enabled,
          updated_at: timestamp,
        });
      }

      // Upsert each configuration
      for (const config of configsToSave) {
        const { error } = await supabase
          .from('api_configurations')
          .upsert(config, {
            onConflict: 'service_name'
          });

        if (error) {
          throw error;
        }
      }

      console.log('💾 ConfigStorage: Saved configuration successfully');
    } catch (error) {
      console.error('💾 ConfigStorage: Failed to save configuration:', error);
      throw error;
    }
  }

  async loadConfig(): Promise<ApiConfigData> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        console.log('💾 ConfigStorage: Not available, returning empty config');
        return {};
      }

      const { data, error } = await supabase
        .from('api_configurations')
        .select('*');

      if (error) {
        console.error('💾 ConfigStorage: Failed to load configuration:', error);
        return {};
      }

      const result: ApiConfigData = {};

      for (const config of data || []) {
        switch (config.service_name) {
          case 'servemanager':
            result.serveManager = {
              baseUrl: config.base_url || '',
              apiKey: config.api_key || '',
              enabled: config.enabled || false,
              testEndpoint: '/account',
            };
            break;
          
          case 'stripe':
            result.stripe = {
              publishableKey: config.publishable_key || '',
              secretKey: config.secret_key || '',
              webhookSecret: config.webhook_secret || '',
              enabled: config.enabled || false,
              environment: (config.environment as 'test' | 'live') || 'test',
            };
            break;
          
          case 'radar':
            result.radar = {
              publishableKey: config.publishable_key || '',
              secretKey: config.secret_key || '',
              enabled: config.enabled || false,
              environment: (config.environment as 'test' | 'live') || 'test',
            };
            break;
        }
      }

      console.log('💾 ConfigStorage: Loaded configuration successfully');
      return result;
    } catch (error) {
      console.error('💾 ConfigStorage: Failed to load configuration:', error);
      return {};
    }
  }

  async getServiceConfig(serviceName: string): Promise<StoredApiConfig | null> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return null;
      }

      const { data, error } = await supabase
        .from('api_configurations')
        .select('*')
        .eq('service_name', serviceName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`💾 ConfigStorage: Failed to get ${serviceName} config:`, error);
      return null;
    }
  }

  // Helper method to get masked config for API responses
  async getMaskedConfig(): Promise<ApiConfigData> {
    const config = await this.loadConfig();
    
    // Mask sensitive values
    if (config.serveManager?.apiKey) {
      config.serveManager.apiKey = '***' + config.serveManager.apiKey.slice(-4);
    }
    if (config.stripe?.secretKey) {
      config.stripe.secretKey = '***' + config.stripe.secretKey.slice(-4);
    }
    if (config.stripe?.webhookSecret) {
      config.stripe.webhookSecret = '***' + config.stripe.webhookSecret.slice(-4);
    }
    if (config.radar?.secretKey) {
      config.radar.secretKey = '***' + config.radar.secretKey.slice(-4);
    }

    return config;
  }

  // Helper to merge environment variables with stored config
  async getEffectiveConfig(): Promise<ApiConfigData> {
    const storedConfig = await this.loadConfig();
    
    // Environment variables take precedence
    const result: ApiConfigData = {};

    // ServeManager
    result.serveManager = {
      baseUrl: process.env.SERVEMANAGER_BASE_URL || storedConfig.serveManager?.baseUrl || '',
      apiKey: process.env.SERVEMANAGER_API_KEY || storedConfig.serveManager?.apiKey || '',
      enabled: Boolean(
        process.env.SERVEMANAGER_BASE_URL || 
        process.env.SERVEMANAGER_API_KEY || 
        storedConfig.serveManager?.enabled
      ),
      testEndpoint: '/account',
    };

    // Stripe
    result.stripe = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || storedConfig.stripe?.publishableKey || '',
      secretKey: process.env.STRIPE_SECRET_KEY || storedConfig.stripe?.secretKey || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || storedConfig.stripe?.webhookSecret || '',
      enabled: Boolean(
        process.env.STRIPE_SECRET_KEY || 
        storedConfig.stripe?.enabled
      ),
      environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || storedConfig.stripe?.environment || 'test',
    };

    // Radar
    result.radar = {
      publishableKey: process.env.RADAR_PUBLISHABLE_KEY || storedConfig.radar?.publishableKey || '',
      secretKey: process.env.RADAR_SECRET_KEY || storedConfig.radar?.secretKey || '',
      enabled: Boolean(
        process.env.RADAR_SECRET_KEY || 
        storedConfig.radar?.enabled
      ),
      environment: (process.env.RADAR_ENVIRONMENT as 'test' | 'live') || storedConfig.radar?.environment || 'test',
    };

    return result;
  }
}

// Singleton instance
export const configStorageService = new ConfigStorageService();
