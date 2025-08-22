/**
 * Safe fetch utility to handle FullStory and other analytics interference
 */

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
}

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;
  
  try {
    // Try native fetch first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await window.fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    console.log('🔄 Native fetch failed, trying XMLHttpRequest fallback:', error.message);
    
    // Fallback to XMLHttpRequest if fetch is intercepted by analytics
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(fetchOptions.method || 'GET', url);
      
      // Set headers
      if (fetchOptions.headers) {
        const headers = new Headers(fetchOptions.headers);
        headers.forEach((value, key) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      xhr.timeout = timeout;
      xhr.responseType = 'text';
      
      xhr.onload = () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers()
        });
        resolve(response);
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('Request timeout'));
      };
      
      xhr.onabort = () => {
        reject(new Error('Request aborted'));
      };
      
      xhr.send(fetchOptions.body as string);
    });
  }
}

export function detectAnalyticsInterference(): boolean {
  try {
    // Check if fetch has been monkey-patched
    const fetchString = window.fetch.toString();
    return fetchString.includes('FullStory') || 
           fetchString.includes('analytics') ||
           fetchString.includes('tracking') ||
           fetchString.length > 200; // Native fetch toString is short
  } catch {
    return false;
  }
}

export function logFetchDiagnostics() {
  console.log('🔍 Fetch diagnostics:', {
    hasFetch: typeof window.fetch === 'function',
    fetchStringLength: window.fetch?.toString().length,
    interferenceDetected: detectAnalyticsInterference(),
    userAgent: navigator.userAgent
  });
}
