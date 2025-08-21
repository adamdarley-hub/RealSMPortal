// Simple configuration utilities for Vercel API endpoints
// This avoids complex imports and module dependencies

export interface ServeManagerConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export async function getServeManagerConfig(): Promise<ServeManagerConfig> {
  try {
    // Priority: Environment variables -> Supabase -> Global memory -> Default
    
    // 1. Check environment variables first
    const envBaseUrl = process.env.SERVEMANAGER_BASE_URL;
    const envApiKey = process.env.SERVEMANAGER_API_KEY;
    
    if (envBaseUrl && envApiKey) {
      return {
        baseUrl: envBaseUrl,
        apiKey: envApiKey,
        enabled: true,
      };
    }

    // 2. Try to load from Supabase
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
          .from('api_configurations')
          .select('*')
          .eq('service_name', 'servemanager')
          .single();

        if (!error && data) {
          return {
            baseUrl: data.base_url || '',
            apiKey: data.api_key || '',
            enabled: data.enabled || false,
          };
        }
      }
    } catch (supabaseError) {
      console.log('Failed to load from Supabase:', supabaseError);
    }

    // 3. Fall back to global memory
    const globalConfig = global.tempApiConfig?.serveManager;
    if (globalConfig?.baseUrl && globalConfig?.apiKey) {
      return {
        baseUrl: globalConfig.baseUrl,
        apiKey: globalConfig.apiKey,
        enabled: globalConfig.enabled || false,
      };
    }

    // 4. Return disabled config as default
    return {
      baseUrl: '',
      apiKey: '',
      enabled: false,
    };
  } catch (error) {
    console.error('Error getting ServeManager config:', error);
    return {
      baseUrl: '',
      apiKey: '',
      enabled: false,
    };
  }
}
