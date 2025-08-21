import type { VercelRequest, VercelResponse } from "@vercel/node";

// Simple storage using a global variable with potential Supabase fallback
// This avoids complex module imports that might fail in Vercel

interface ApiConfigData {
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

// Initialize global config if not exists
if (!global.tempApiConfig) {
  global.tempApiConfig = {
    serveManager: {
      baseUrl: "",
      apiKey: "",
      enabled: false,
      testEndpoint: "/account",
    },
    radar: {
      publishableKey: "",
      secretKey: "",
      enabled: false,
      environment: "test",
    },
    stripe: {
      publishableKey: "",
      secretKey: "",
      enabled: false,
      environment: "test",
      webhookSecret: "",
    },
  };
}

async function saveToSupabase(configData: ApiConfigData): Promise<boolean> {
  try {
    // Try to use Supabase if available
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
      console.log('💾 Supabase not configured, using fallback');
      return false;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if table exists by trying to query it
    const { error: testError } = await supabase
      .from('api_configurations')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('💾 API configurations table not available:', testError.message);
      return false;
    }

    const timestamp = new Date().toISOString();
    const configsToSave = [];

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
        console.error('💾 Error saving to Supabase:', error);
        return false;
      }
    }

    console.log('💾 Successfully saved configuration to Supabase');
    return true;
  } catch (error) {
    console.error('💾 Error with Supabase operation:', error);
    return false;
  }
}

async function loadFromSupabase(): Promise<ApiConfigData | null> {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
      return null;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('api_configurations')
      .select('*');

    if (error) {
      console.log('💾 Error loading from Supabase:', error.message);
      return null;
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
            environment: config.environment || 'test',
          };
          break;
        
        case 'radar':
          result.radar = {
            publishableKey: config.publishable_key || '',
            secretKey: config.secret_key || '',
            enabled: config.enabled || false,
            environment: config.environment || 'test',
          };
          break;
      }
    }

    return result;
  } catch (error) {
    console.error('💾 Error loading from Supabase:', error);
    return null;
  }
}

function getEffectiveConfig(storedConfig: ApiConfigData | null): ApiConfigData {
  return {
    serveManager: {
      baseUrl: process.env.SERVEMANAGER_BASE_URL || storedConfig?.serveManager?.baseUrl || global.tempApiConfig?.serveManager?.baseUrl || '',
      apiKey: process.env.SERVEMANAGER_API_KEY || storedConfig?.serveManager?.apiKey || global.tempApiConfig?.serveManager?.apiKey || '',
      enabled: Boolean(
        process.env.SERVEMANAGER_BASE_URL || 
        process.env.SERVEMANAGER_API_KEY || 
        storedConfig?.serveManager?.enabled ||
        global.tempApiConfig?.serveManager?.enabled
      ),
      testEndpoint: '/account',
    },
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || storedConfig?.stripe?.publishableKey || global.tempApiConfig?.stripe?.publishableKey || '',
      secretKey: process.env.STRIPE_SECRET_KEY || storedConfig?.stripe?.secretKey || global.tempApiConfig?.stripe?.secretKey || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || storedConfig?.stripe?.webhookSecret || global.tempApiConfig?.stripe?.webhookSecret || '',
      enabled: Boolean(process.env.STRIPE_SECRET_KEY || storedConfig?.stripe?.enabled || global.tempApiConfig?.stripe?.enabled),
      environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || storedConfig?.stripe?.environment || global.tempApiConfig?.stripe?.environment || 'test',
    },
    radar: {
      publishableKey: process.env.RADAR_PUBLISHABLE_KEY || storedConfig?.radar?.publishableKey || global.tempApiConfig?.radar?.publishableKey || '',
      secretKey: process.env.RADAR_SECRET_KEY || storedConfig?.radar?.secretKey || global.tempApiConfig?.radar?.secretKey || '',
      enabled: Boolean(process.env.RADAR_SECRET_KEY || storedConfig?.radar?.enabled || global.tempApiConfig?.radar?.enabled),
      environment: (process.env.RADAR_ENVIRONMENT as 'test' | 'live') || storedConfig?.radar?.environment || global.tempApiConfig?.radar?.environment || 'test',
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      console.log("🔧 VERCEL DEBUG - Config GET request received");

      try {
        // Try to load from Supabase first
        const storedConfig = await loadFromSupabase();
        console.log("💾 VERCEL DEBUG - Stored config loaded:", !!storedConfig);

        // Get effective configuration
        const effectiveConfig = getEffectiveConfig(storedConfig);
        
        // Mask sensitive values for API response
        const config = {
          serveManager: {
            baseUrl: effectiveConfig.serveManager.baseUrl,
            apiKey: effectiveConfig.serveManager.apiKey 
              ? "***" + effectiveConfig.serveManager.apiKey.slice(-4)
              : "",
            enabled: effectiveConfig.serveManager.enabled,
            testEndpoint: "/account",
          },
          stripe: {
            publishableKey: effectiveConfig.stripe.publishableKey,
            secretKey: effectiveConfig.stripe.secretKey
              ? "***" + effectiveConfig.stripe.secretKey.slice(-4)
              : "",
            webhookSecret: effectiveConfig.stripe.webhookSecret
              ? "***" + effectiveConfig.stripe.webhookSecret.slice(-4)
              : "",
            enabled: effectiveConfig.stripe.enabled,
            environment: effectiveConfig.stripe.environment,
          },
          radar: {
            publishableKey: effectiveConfig.radar.publishableKey,
            secretKey: effectiveConfig.radar.secretKey
              ? "***" + effectiveConfig.radar.secretKey.slice(-4)
              : "",
            enabled: effectiveConfig.radar.enabled,
            environment: effectiveConfig.radar.environment,
          },
        };

        console.log("📤 VERCEL DEBUG - Returning config:", {
          serveManagerEnabled: config.serveManager.enabled,
          serveManagerHasUrl: !!config.serveManager.baseUrl,
          serveManagerHasKey: !!config.serveManager.apiKey && config.serveManager.apiKey !== "",
          stripeEnabled: config.stripe.enabled,
          hasStoredConfig: !!storedConfig,
        });

        return res.status(200).json(config);
      } catch (error) {
        console.error("🚨 VERCEL DEBUG - Error loading config:", error);
        return res.status(500).json({
          error: "Failed to load configuration",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (req.method === "POST") {
      console.log("💾 VERCEL DEBUG - Saving config...");

      try {
        const newConfig = req.body;
        console.log("📝 VERCEL DEBUG - Received config data");

        // Don't update masked keys - preserve existing values
        const configToStore = { ...newConfig };

        // Try to save to Supabase first
        const savedToSupabase = await saveToSupabase(configToStore);
        
        if (savedToSupabase) {
          console.log("✅ VERCEL DEBUG - Configuration saved to Supabase!");
          
          return res.status(200).json({
            message: "Configuration saved successfully to persistent storage!",
            storage: "database",
          });
        } else {
          // Fallback to global memory
          console.log("⚠️ VERCEL DEBUG - Falling back to global memory storage");
          
          // Handle masked values with global memory fallback
          if (configToStore.serveManager?.apiKey?.startsWith("***")) {
            if (global.tempApiConfig?.serveManager?.apiKey && !global.tempApiConfig.serveManager.apiKey.startsWith("***")) {
              configToStore.serveManager.apiKey = global.tempApiConfig.serveManager.apiKey;
            } else {
              delete configToStore.serveManager.apiKey;
            }
          }

          // Similar for other masked fields
          if (configToStore.stripe?.secretKey?.startsWith("***")) {
            if (global.tempApiConfig?.stripe?.secretKey) {
              configToStore.stripe.secretKey = global.tempApiConfig.stripe.secretKey;
            } else {
              delete configToStore.stripe.secretKey;
            }
          }
          
          // Store in global memory
          global.tempApiConfig = { ...global.tempApiConfig, ...configToStore };

          return res.status(200).json({
            message: "Configuration saved temporarily! For permanent storage, configure Supabase or set environment variables.",
            storage: "memory",
          });
        }
      } catch (error) {
        console.error("🚨 VERCEL DEBUG - Error saving config:", error);
        return res.status(500).json({
          error: "Failed to save configuration",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🚨 VERCEL CONFIG - Unhandled error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
