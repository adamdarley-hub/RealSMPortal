export interface ApiConfig {
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

export interface ConfigResponse {
  serveManager?: {
    baseUrl: string;
    apiKey: string; // This will be masked when returned from API
    enabled: boolean;
    testEndpoint: string;
  };
  radar?: {
    publishableKey: string;
    secretKey: string; // This will be masked when returned from API
    enabled: boolean;
    environment: 'test' | 'live';
  };
}

export interface TestApiRequest {
  baseUrl?: string;
  apiKey?: string;
  testEndpoint?: string;
  publishableKey?: string;
  secretKey?: string;
  environment?: 'test' | 'live';
}

export interface TestApiResponse {
  message: string;
  error?: string;
}
